const isString = (v) => typeof v === "string";
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Validate a review payload. `isCreate` controls whether required-field
 * checks apply (POST) vs. only shape checks (PUT). Returns an array of
 * human-readable error strings — empty means the payload is valid.
 */
function validatePayload(payload, { isCreate }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["Request body must be a JSON object"];
  }

  const errors = [];

  // rating
  if (isCreate && payload.rating === undefined) {
    errors.push("`rating` is required");
  } else if ("rating" in payload) {
    if (!isNumber(payload.rating)) {
      errors.push("`rating` must be a number");
    } else if (payload.rating < 1 || payload.rating > 5) {
      errors.push("`rating` must be between 1 and 5");
    }
  }

  // text
  if (isCreate && !isNonEmptyString(payload.text)) {
    errors.push("`text` is required and must be a non-empty string");
  } else if ("text" in payload && !isNonEmptyString(payload.text)) {
    errors.push("`text` must be a non-empty string");
  }

  // restaurant id (create-only — updates don't reassign the restaurant)
  if (isCreate && !isNonEmptyString(payload.restaurant)) {
    errors.push("`restaurant` (restaurant id) is required");
  }

  return errors;
}

function respond400(res, errors) {
  return res.status(400).json({
    error: {
      message: "Invalid payload",
      details: errors,
      status: 400,
    },
  });
}

export function validateCreateReview(req, res, next) {
  const errors = validatePayload(req.body, { isCreate: true });
  if (errors.length > 0) return respond400(res, errors);
  next();
}

export function validateUpdateReview(req, res, next) {
  const errors = validatePayload(req.body, { isCreate: false });
  if (errors.length > 0) return respond400(res, errors);
  next();
}
