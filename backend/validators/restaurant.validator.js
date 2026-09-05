import { RESTAURANT_TYPES } from "../models/restaurant.model.js";

const isString = (v) => typeof v === "string";
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const isBoolean = (v) => typeof v === "boolean";
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isArrayOfStrings = (v) => Array.isArray(v) && v.every(isString);

const DIETARY_KEYS = [
  "glutenFree",
  "dairyFree",
  "eggFree",
  "nutFree",
  "peanutFree",
  "treeNutFree",
  "soyFree",
  "vegetarian",
  "vegan",
  "halal",
  "kosher",
  "shellfishFree",
  "sesameFree",
];

const FEATURE_KEYS = [
  "dedicatedGfKitchen",
  "separateFryer",
  "gfMenu",
  "gfDesserts",
  "certifiedGlutenFree",
  "staffTrainedForCeliac",
  "crossContaminationPrecautions",
];

const ADDRESS_KEYS = ["street", "city", "state", "zip", "country"];

/**
 * Validate a Restaurant payload. `isCreate` controls whether required-field
 * checks apply. Returns an array of human-readable error strings; empty
 * array means the payload is valid.
 */
function validatePayload(payload, { isCreate }) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["Request body must be a JSON object"];
  }

  // Required on create
  if (isCreate && !isNonEmptyString(payload.name)) {
    errors.push("`name` is required and must be a non-empty string");
  } else if ("name" in payload && !isNonEmptyString(payload.name)) {
    errors.push("`name` must be a non-empty string");
  }

  if ("description" in payload && !isString(payload.description)) {
    errors.push("`description` must be a string");
  }
  if ("phone" in payload && !isString(payload.phone)) {
    errors.push("`phone` must be a string");
  }
  if ("website" in payload && !isString(payload.website)) {
    errors.push("`website` must be a string");
  }
  if ("imageUrl" in payload && !isString(payload.imageUrl)) {
    errors.push("`imageUrl` must be a string");
  }

  if ("address" in payload) {
    const a = payload.address;
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      errors.push("`address` must be an object");
    } else {
      for (const key of ADDRESS_KEYS) {
        if (key in a && !isString(a[key])) {
          errors.push(`\`address.${key}\` must be a string`);
        }
      }
    }
  }

  if ("location" in payload && payload.location != null) {
    const loc = payload.location;
    if (typeof loc !== "object" || Array.isArray(loc)) {
      errors.push("`location` must be a GeoJSON Point object");
    } else {
      if (loc.type !== "Point") {
        errors.push('`location.type` must be "Point"');
      }
      if (
        !Array.isArray(loc.coordinates) ||
        loc.coordinates.length !== 2 ||
        !loc.coordinates.every(isNumber)
      ) {
        errors.push(
          "`location.coordinates` must be an array of two numbers: [lng, lat]"
        );
      }
    }
  }

  if ("cuisine" in payload && !isArrayOfStrings(payload.cuisine)) {
    errors.push("`cuisine` must be an array of strings");
  }

  if ("restaurantType" in payload) {
    if (!isArrayOfStrings(payload.restaurantType)) {
      errors.push("`restaurantType` must be an array of strings");
    } else {
      const invalid = payload.restaurantType.filter(
        (t) => !RESTAURANT_TYPES.includes(t)
      );
      if (invalid.length > 0) {
        errors.push(
          `\`restaurantType\` contains invalid values: ${invalid.join(", ")}. ` +
            `Allowed: ${RESTAURANT_TYPES.join(", ")}`
        );
      }
    }
  }

  if ("dietary" in payload) {
    const d = payload.dietary;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      errors.push("`dietary` must be an object of booleans");
    } else {
      for (const key of Object.keys(d)) {
        if (!DIETARY_KEYS.includes(key)) {
          errors.push(`\`dietary.${key}\` is not a recognized dietary flag`);
        } else if (!isBoolean(d[key])) {
          errors.push(`\`dietary.${key}\` must be a boolean`);
        }
      }
    }
  }

  if ("features" in payload) {
    const f = payload.features;
    if (!f || typeof f !== "object" || Array.isArray(f)) {
      errors.push("`features` must be an object of booleans");
    } else {
      for (const key of Object.keys(f)) {
        if (!FEATURE_KEYS.includes(key)) {
          errors.push(`\`features.${key}\` is not a recognized feature`);
        } else if (!isBoolean(f[key])) {
          errors.push(`\`features.${key}\` must be a boolean`);
        }
      }
    }
  }

  if ("averageRating" in payload && !isNumber(payload.averageRating)) {
    errors.push("`averageRating` must be a number");
  }
  if ("reviewCount" in payload && !isNumber(payload.reviewCount)) {
    errors.push("`reviewCount` must be a number");
  }

  return errors;
}

/**
 * Express middleware factory. Returns a middleware that runs the payload
 * validator and, on failure, responds with 400 without calling the handler.
 */
export function validateCreateRestaurant(req, res, next) {
  const errors = validatePayload(req.body, { isCreate: true });
  if (errors.length > 0) {
    return res.status(400).json({ error: { message: "Invalid payload", details: errors, status: 400 } });
  }
  next();
}

export function validateUpdateRestaurant(req, res, next) {
  const errors = validatePayload(req.body, { isCreate: false });
  if (errors.length > 0) {
    return res.status(400).json({ error: { message: "Invalid payload", details: errors, status: 400 } });
  }
  next();
}
