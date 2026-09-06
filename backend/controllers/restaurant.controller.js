import mongoose from "mongoose";
import Restaurant from "../models/restaurant.model.js";

/**
 * Escape a user-supplied string so it can be safely embedded in a RegExp
 * for case-insensitive partial matching (prevents ReDoS via unescaped
 * metacharacters).
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split a "a,b, c" query-param string into a clean array. Returns an empty
 * array for missing / empty / non-string input, so callers can just check
 * `.length`.
 */
function parseCsv(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse a query-string value as a finite Number, or null if it isn't. */
function parseFiniteNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Earth's mean radius in kilometers. Used to convert a km radius into the
// radians that MongoDB's $centerSphere operator expects.
const EARTH_RADIUS_KM = 6378.1;
// Default search radius (km) when lat/lng are supplied without an explicit
// radius.
const DEFAULT_RADIUS_KM = 25;

function badId(res, id) {
  return res.status(400).json({
    error: { message: `Invalid restaurant id: ${id}`, status: 400 },
  });
}

function notFound(res, id) {
  return res.status(404).json({
    error: { message: `Restaurant not found: ${id}`, status: 404 },
  });
}

/**
 * GET /api/restaurants
 *
 * Optional, combinable query params:
 *
 * - name, city               case-insensitive partial (regex) match
 * - state, zip               exact match
 * - restaurantType           comma-separated; match ANY of the listed types
 *                              e.g. ?restaurantType=bakery,coffee_shop
 * - dietary                  comma-separated dietary flags; EVERY one must
 *                              be true on the restaurant
 *                              e.g. ?dietary=glutenFree,vegan
 * - features                 comma-separated feature flags; EVERY one must
 *                              be true (same semantics as `dietary`)
 * - lat, lng, radius         geospatial filter — only restaurants whose
 *                              `location` point falls within `radius` km of
 *                              (lng, lat). radius defaults to 25 km if
 *                              lat/lng are given without it. Requires the
 *                              2dsphere index on `location`.
 *
 * The mongo filter is built up piece by piece so that any combination of
 * params AND together naturally.
 */
export async function getAllRestaurants(req, res, next) {
  try {
    const {
      name,
      city,
      state,
      zip,
      restaurantType,
      dietary,
      features,
      lat,
      lng,
      radius,
    } = req.query;

    const filter = {};

    // ── Text filters ────────────────────────────────────────────────────
    // `name` and `city` are case-insensitive substring matches so users can
    // type "bakery" and match "Wildwood Bakehouse".
    if (name) {
      filter.name = { $regex: escapeRegex(name), $options: "i" };
    }
    if (city) {
      filter["address.city"] = { $regex: escapeRegex(city), $options: "i" };
    }
    // `state` / `zip` are exact matches — small controlled vocabularies
    // where partial matching would only add noise.
    if (state) filter["address.state"] = state;
    if (zip) filter["address.zip"] = zip;

    // ── restaurantType (match ANY of the listed types) ─────────────────
    // Uses $in so `?restaurantType=bakery,coffee_shop` returns anything
    // tagged bakery OR coffee_shop.
    const typeList = parseCsv(restaurantType);
    if (typeList.length > 0) {
      filter.restaurantType = { $in: typeList };
    }

    // ── dietary flags (EVERY listed flag must be true) ─────────────────
    // Each flag lives at its own path (dietary.<flag>), so we can add one
    // condition per flag directly to the filter — Mongo AND-combines them,
    // no need for an explicit $and.
    for (const flag of parseCsv(dietary)) {
      filter[`dietary.${flag}`] = true;
    }

    // ── feature flags (EVERY listed feature must be true) ──────────────
    // Same rule and mechanism as `dietary`, on the `features` subdoc.
    for (const flag of parseCsv(features)) {
      filter[`features.${flag}`] = true;
    }

    // ── Geospatial radius search ───────────────────────────────────────
    // We apply the geo filter only when BOTH lat and lng are valid numbers.
    // If the caller passes one without the other (or an unparseable value),
    // that's a bad request — return 400 rather than silently ignoring it.
    const latN = parseFiniteNumber(lat);
    const lngN = parseFiniteNumber(lng);
    const hasLatOrLng = lat != null || lng != null;

    if (hasLatOrLng && (latN == null || lngN == null)) {
      return res.status(400).json({
        error: {
          message:
            "`lat` and `lng` must both be present and be valid numbers to filter by location",
          status: 400,
        },
      });
    }

    if (latN != null && lngN != null) {
      // Default the radius when lat/lng are given but `radius` isn't.
      const radiusKm = parseFiniteNumber(radius) ?? DEFAULT_RADIUS_KM;
      // $centerSphere takes the radius in RADIANS, not km, so divide by
      // Earth's radius in km. Coordinates are [longitude, latitude] — the
      // GeoJSON order, not the "lat,lng" order you see in map URLs.
      filter.location = {
        $geoWithin: {
          $centerSphere: [[lngN, latN], radiusKm / EARTH_RADIUS_KM],
        },
      };
    }

    const restaurants = await Restaurant.find(filter).sort({ name: 1 });
    res.json(restaurants);
  } catch (err) {
    next(err);
  }
}

/** GET /api/restaurants/:id */
export async function getRestaurantById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return notFound(res, id);

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
}

/** POST /api/restaurants */
export async function createRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json(restaurant);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/restaurants/:id */
export async function updateRestaurant(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const restaurant = await Restaurant.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!restaurant) return notFound(res, id);

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/restaurants/:id */
export async function deleteRestaurant(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const restaurant = await Restaurant.findByIdAndDelete(id);
    if (!restaurant) return notFound(res, id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
