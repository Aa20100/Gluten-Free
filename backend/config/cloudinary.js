import { v2 as cloudinary } from "cloudinary";

/**
 * Configure the Cloudinary SDK once at import time.
 *
 * `secure: true` forces https URLs in every response so we never serve
 * plain-http image links to the browser. When the env vars are missing
 * the SDK's calls will just fail — we log a warning so the reason is
 * obvious in dev.
 */
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    "[cloudinary] one or more of CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET is not set — image uploads will fail until you add them to backend/.env"
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

/** True when all three env vars are present. */
export const isCloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

export default cloudinary;
