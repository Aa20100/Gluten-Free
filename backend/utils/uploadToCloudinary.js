import cloudinary from "../config/cloudinary.js";

/**
 * Upload a single Buffer to Cloudinary. Uses the SDK's `upload_stream`
 * so we don't need a temp file — pipe the multer-parsed buffer straight
 * into it and resolve with the response.
 */
function uploadBuffer(buffer, { folder = "safebite/posts" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) return reject(err);
        if (!result?.secure_url) {
          return reject(new Error("Cloudinary response missing secure_url"));
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Upload every file in `files` (as multer produces them — objects with a
 * `.buffer`) to Cloudinary in parallel. Returns the resulting HTTPS URLs
 * in the same order.
 *
 * Pass an empty array and you get back an empty array — no throw.
 */
export async function uploadFilesToCloudinary(files, options) {
  if (!files || files.length === 0) return [];
  const results = await Promise.all(
    files.map((f) => uploadBuffer(f.buffer, options))
  );
  return results.map((r) => r.secure_url);
}
