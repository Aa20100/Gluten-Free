/**
 * One-off import: pull gluten-free-friendly restaurants from
 * OpenStreetMap across major East Coast US cities and insert them into
 * the DB. Runs manually like the seed script:
 *
 *   node utils/importFromOsm.js
 *
 * Design notes:
 * - Only imports elements with `diet:gluten_free` set to "yes" or "only".
 *   Keeps the dataset small, relevant, and manageable.
 * - One Overpass query per city (bounding box). 3s pause between cities
 *   to be polite to the free public server.
 * - On 429 (rate-limited) or 504 (timeout), waits 30s and retries the
 *   city ONCE. If it fails again, logs the failure and moves on.
 * - Skips restaurants whose osmId is already in the DB. Also dedupes
 *   across cities within a single run (a spot near a boundary can
 *   appear in two boxes).
 * - Insert per city (ordered: false) so partial progress persists if
 *   the script is interrupted.
 */

import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import Restaurant from "../models/restaurant.model.js";

// ── Config ──────────────────────────────────────────────────────────────

/**
 * East Coast US metro bounding boxes: (south, west, north, east).
 * Easy to extend — add another entry to import more regions.
 */
const CITIES = [
  { name: "Boston, MA",         south: 42.23,  west: -71.19,  north: 42.40,   east: -70.99  },
  { name: "New York, NY",       south: 40.49,  west: -74.26,  north: 40.92,   east: -73.68  },
  { name: "Jersey City, NJ",    south: 40.68,  west: -74.09,  north: 40.77,   east: -74.02  },
  { name: "Philadelphia, PA",   south: 39.87,  west: -75.28,  north: 40.14,   east: -74.95  },
  { name: "Baltimore, MD",      south: 39.20,  west: -76.71,  north: 39.37,   east: -76.53  },
  { name: "Washington, DC",     south: 38.79,  west: -77.12,  north: 38.996,  east: -76.91  },
  { name: "Richmond, VA",       south: 37.44,  west: -77.60,  north: 37.62,   east: -77.39  },
  { name: "Raleigh, NC",        south: 35.71,  west: -78.78,  north: 35.90,   east: -78.51  },
  { name: "Charlotte, NC",      south: 35.13,  west: -80.95,  north: 35.39,   east: -80.67  },
  { name: "Charleston, SC",     south: 32.71,  west: -80.07,  north: 32.90,   east: -79.83  },
  { name: "Atlanta, GA",        south: 33.65,  west: -84.55,  north: 33.89,   east: -84.29  },
  { name: "Jacksonville, FL",   south: 30.15,  west: -81.86,  north: 30.59,   east: -81.39  },
  { name: "Orlando, FL",        south: 28.41,  west: -81.51,  north: 28.63,   east: -81.24  },
  { name: "Miami, FL",          south: 25.70,  west: -80.32,  north: 25.86,   east: -80.13  },
  { name: "Tampa, FL",          south: 27.87,  west: -82.60,  north: 28.06,   east: -82.36  },
  { name: "Pittsburgh, PA",     south: 40.36,  west: -80.09,  north: 40.50,   east: -79.86  },
  { name: "Portland, ME",       south: 43.62,  west: -70.32,  north: 43.71,   east: -70.20  },
  { name: "Providence, RI",     south: 41.77,  west: -71.47,  north: 41.85,   east: -71.36  },
  { name: "Hartford, CT",       south: 41.72,  west: -72.72,  north: 41.80,   east: -72.65  },
  { name: "Virginia Beach, VA", south: 36.72,  west: -76.15,  north: 36.92,   east: -75.94  },
];

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "SafeBite-Import/1.0";
const DELAY_BETWEEN_CITIES_MS = 3000;
const RETRY_DELAY_MS = 30000;

/** OSM `amenity` → our `restaurantType` array. */
const AMENITY_TO_TYPE = {
  restaurant: ["dinner"],
  cafe: ["coffee_shop"],
  fast_food: ["fast_food"],
  bakery: ["bakery"],
};

// ── Helpers ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isYesOrOnly = (v) => v === "yes" || v === "only";

/** Build the Overpass QL query for one bounding box. */
function queryFor({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:60];
(
  node["amenity"~"restaurant|cafe|fast_food|bakery"]["diet:gluten_free"~"yes|only"](${bbox});
  way["amenity"~"restaurant|cafe|fast_food|bakery"]["diet:gluten_free"~"yes|only"](${bbox});
);
out center tags;`;
}

/** POST the Overpass query. Throws with `.status` set on non-2xx. */
async function fetchOverpass(city) {
  const body = new URLSearchParams({ data: queryFor(city) });
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const err = new Error(`Overpass ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Turn one Overpass element into a doc shaped for our Restaurant model.
 * Returns null if the element lacks a name or valid coords (we skip
 * those — nothing sensible to store).
 */
function mapElement(el) {
  const tags = el.tags || {};
  if (!tags.name) return null;

  // Nodes carry lat/lon directly; ways carry a `.center` from `out center`.
  const lat = el.type === "node" ? el.lat : el.center?.lat;
  const lng = el.type === "node" ? el.lon : el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const osmId = `${el.type}/${el.id}`;
  const amenity = tags.amenity;

  return {
    osmId,
    name: tags.name,
    description: "",
    address: {
      street: tags["addr:street"] || "",
      city: tags["addr:city"] || "",
      state: tags["addr:state"] || "",
      zip: tags["addr:postcode"] || "",
      country: "US",
    },
    // GeoJSON is [longitude, latitude], not [lat, lng] — easy to swap.
    location: { type: "Point", coordinates: [lng, lat] },
    phone: tags.phone || tags["contact:phone"] || "",
    website: tags.website || tags["contact:website"] || "",
    cuisine: (tags.cuisine || "").split(";").filter(Boolean),
    restaurantType: AMENITY_TO_TYPE[amenity] || [],
    dietary: {
      // We filtered on diet:gluten_free=yes|only, so this is always true.
      glutenFree: true,
      vegan: isYesOrOnly(tags["diet:vegan"]),
      vegetarian: isYesOrOnly(tags["diet:vegetarian"]),
      halal: isYesOrOnly(tags["diet:halal"]),
      kosher: isYesOrOnly(tags["diet:kosher"]),
    },
    // OSM doesn't carry our safety-features taxonomy — leave everything
    // false. A future user-driven edit flow can enrich this.
    features: {},
    imageUrls: [],
    source: "osm",
    status: "approved",
  };
}

/**
 * Process one city: fetch, map, dedupe (in-memory + DB), insert.
 * Returns per-city counters for the summary log.
 */
async function processCity(city, seenOsmIds) {
  const counters = { fetched: 0, dupes: 0, invalid: 0, inserted: 0, errors: 0 };

  // ── Fetch with a single 429/504 retry ──────────────────────────────
  let payload;
  try {
    payload = await fetchOverpass(city);
  } catch (err) {
    if (err.status === 429 || err.status === 504) {
      console.log(
        `  [${city.name}] ${err.status}, waiting ${RETRY_DELAY_MS / 1000}s and retrying…`
      );
      await sleep(RETRY_DELAY_MS);
      try {
        payload = await fetchOverpass(city);
      } catch (err2) {
        console.error(`  [${city.name}] failed after retry: ${err2.message}`);
        counters.errors = 1;
        return counters;
      }
    } else {
      console.error(`  [${city.name}] fetch failed: ${err.message}`);
      counters.errors = 1;
      return counters;
    }
  }

  const elements = payload.elements || [];
  counters.fetched = elements.length;

  // ── Map + in-memory dedupe ──────────────────────────────────────────
  const mapped = [];
  for (const el of elements) {
    const doc = mapElement(el);
    if (!doc) {
      counters.invalid += 1;
      continue;
    }
    if (seenOsmIds.has(doc.osmId)) {
      counters.dupes += 1;
      continue;
    }
    mapped.push(doc);
  }

  if (mapped.length === 0) return counters;

  // ── Skip anything already in the DB ─────────────────────────────────
  const candidateOsmIds = mapped.map((m) => m.osmId);
  const existing = await Restaurant.find(
    { osmId: { $in: candidateOsmIds } },
    { osmId: 1 }
  ).lean();
  const existingSet = new Set(existing.map((r) => r.osmId));

  const toInsert = [];
  for (const doc of mapped) {
    if (existingSet.has(doc.osmId)) {
      counters.dupes += 1;
      continue;
    }
    toInsert.push(doc);
    seenOsmIds.add(doc.osmId);
  }

  if (toInsert.length === 0) return counters;

  // ── Insert (ordered:false so one bad row doesn't abort the batch) ──
  try {
    const inserted = await Restaurant.insertMany(toInsert, { ordered: false });
    counters.inserted = inserted.length;
  } catch (err) {
    // With ordered:false, insertMany still throws when any row errors
    // out, but the good rows are committed. The error carries an
    // `insertedDocs` array and `writeErrors` describing the rejects.
    const okCount = err.insertedDocs?.length ?? 0;
    const failCount = err.writeErrors?.length ?? toInsert.length - okCount;
    counters.inserted = okCount;
    if (failCount > 0) {
      counters.errors = failCount;
      console.warn(
        `  [${city.name}] ${failCount} write error${failCount === 1 ? "" : "s"} during insert`
      );
    }
  }

  return counters;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();
  console.log(`[osm-import] Starting import across ${CITIES.length} cities…`);

  const seenOsmIds = new Set();
  const totals = { fetched: 0, dupes: 0, invalid: 0, inserted: 0, errors: 0 };

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i];
    if (i > 0) await sleep(DELAY_BETWEEN_CITIES_MS);

    const r = await processCity(city, seenOsmIds);
    for (const k of Object.keys(totals)) totals[k] += r[k];

    console.log(
      `[${city.name}] fetched ${r.fetched}, ` +
        `skipped ${r.dupes} (dupes), ` +
        `skipped ${r.invalid} (no name), ` +
        `inserted ${r.inserted}, ` +
        `errors ${r.errors}`
    );
  }

  console.log(
    `\n[osm-import] TOTAL — fetched ${totals.fetched}, ` +
      `dupes ${totals.dupes}, ` +
      `no-name ${totals.invalid}, ` +
      `inserted ${totals.inserted}, ` +
      `errors ${totals.errors}`
  );
}

main()
  .catch((err) => {
    console.error("[osm-import] Fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("[osm-import] Disconnected.");
  });
