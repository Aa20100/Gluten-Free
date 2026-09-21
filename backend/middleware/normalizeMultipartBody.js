/**
 * Coerce multipart form fields into the shapes downstream validators and
 * models expect. `req.body` after multer looks like:
 *
 *   { title, body, category,
 *     tags: "chicago, pizza"             // csv string
 *     imageUrls: '["https://..."]',      // JSON array (edit case, any resource)
 *     dietary: '{"glutenFree":true,…}',  // JSON object (restaurant suggest)
 *     ...
 *   }
 *
 * For JSON requests these fields already have the right shapes, so this
 * middleware no-ops on them. It also no-ops on fields that aren't
 * present — every rule is defensive.
 *
 * Runs BEFORE the validator so it can enforce array/object rules
 * against a clean shape. Reused by post, review, and restaurant routes;
 * unused rules are harmless no-ops per resource.
 */

// Fields that arrive as a comma-separated string and should become an
// array of trimmed non-empty strings.
const CSV_FIELDS = ["tags"];

// Fields that arrive as a JSON string and should be parsed. On parse
// failure we leave the raw string so the validator can flag it.
const JSON_FIELDS = [
  "imageUrls",
  "cuisine",
  "restaurantType",
  "address",
  "location",
  "dietary",
  "features",
];

export function normalizeMultipartBody(req, _res, next) {
  const b = req.body || {};

  for (const key of CSV_FIELDS) {
    if (typeof b[key] === "string") {
      b[key] = b[key]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  for (const key of JSON_FIELDS) {
    if (typeof b[key] === "string" && b[key].trim() !== "") {
      try {
        b[key] = JSON.parse(b[key]);
      } catch {
        // Fall through — validator will surface the invalid shape.
      }
    }
  }

  req.body = b;
  next();
}
