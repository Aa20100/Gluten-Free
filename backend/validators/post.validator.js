import { POST_CATEGORIES } from "../models/post.model.js";

const isString = (v) => typeof v === "string";
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const isArrayOfStrings = (v) => Array.isArray(v) && v.every(isString);

/**
 * Validate a Post payload. `isCreate` toggles required-field checks so
 * PUT can accept partial updates.
 * Returns [] on success or an array of human-readable error strings.
 */
function validatePayload(payload, { isCreate }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["Request body must be a JSON object"];
  }

  const errors = [];

  // title
  if (isCreate && !isNonEmptyString(payload.title)) {
    errors.push("`title` is required and must be a non-empty string");
  } else if ("title" in payload && !isNonEmptyString(payload.title)) {
    errors.push("`title` must be a non-empty string");
  }

  // body
  if (isCreate && !isNonEmptyString(payload.body)) {
    errors.push("`body` is required and must be a non-empty string");
  } else if ("body" in payload && !isNonEmptyString(payload.body)) {
    errors.push("`body` must be a non-empty string");
  }

  // category
  if (isCreate && !isNonEmptyString(payload.category)) {
    errors.push("`category` is required");
  }
  if ("category" in payload) {
    if (!isNonEmptyString(payload.category)) {
      errors.push("`category` must be a non-empty string");
    } else if (!POST_CATEGORIES.includes(payload.category)) {
      errors.push(
        `\`category\` must be one of: ${POST_CATEGORIES.join(", ")}`
      );
    }
  }

  // Optional arrays
  if ("tags" in payload && !isArrayOfStrings(payload.tags)) {
    errors.push("`tags` must be an array of strings");
  }
  if ("imageUrls" in payload && !isArrayOfStrings(payload.imageUrls)) {
    errors.push("`imageUrls` must be an array of strings");
  }

  return errors;
}

function respond400(res, errors) {
  return res.status(400).json({
    error: { message: "Invalid payload", details: errors, status: 400 },
  });
}

export function validateCreatePost(req, res, next) {
  const errors = validatePayload(req.body, { isCreate: true });
  if (errors.length > 0) return respond400(res, errors);
  next();
}

export function validateUpdatePost(req, res, next) {
  const errors = validatePayload(req.body, { isCreate: false });
  if (errors.length > 0) return respond400(res, errors);
  next();
}
