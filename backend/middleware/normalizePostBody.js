/**
 * Coerce multipart form fields into the shapes the Post validator/model
 * expect. `req.body` after multer looks like:
 *
 *   { title, body, category,
 *     tags: "chicago, pizza"           // csv string
 *     imageUrls: '["https://..."]',    // JSON string (edit case)
 *   }
 *
 * For JSON requests these fields already have the right shapes, so this
 * middleware no-ops on them.
 *
 * Runs BEFORE the validator so it can enforce the array-of-strings rule
 * against a clean shape.
 */
export function normalizePostBody(req, _res, next) {
  const b = req.body || {};

  // tags: csv → array of trimmed non-empty strings.
  if (typeof b.tags === "string") {
    b.tags = b.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // imageUrls: JSON string → array. Left alone if it's already an array
  // or an empty/undefined value.
  if (typeof b.imageUrls === "string" && b.imageUrls.trim() !== "") {
    try {
      const parsed = JSON.parse(b.imageUrls);
      if (Array.isArray(parsed)) b.imageUrls = parsed;
    } catch {
      // Fall through — the validator will surface the invalid shape.
    }
  }

  req.body = b;
  next();
}
