import multer from "multer";

/** Cap uploads at 5 MB and 6 images per request. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 6;

/** Reject anything that isn't a plain image. */
function imagesOnly(_req, file, cb) {
  if (file.mimetype?.startsWith("image/")) return cb(null, true);
  cb(new Error("Only image files are allowed"));
}

/**
 * Memory-storage multer instance. Files live in RAM as Buffer until we
 * pipe them to Cloudinary — no filesystem side-effects, which suits a
 * containerized / serverless deploy fine at this size limit.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: imagesOnly,
});

/**
 * Express handler for `.array("images", N)` that translates multer's
 * limit-exceeded errors into our standard 400 envelope. Use as:
 *
 *   router.post("/", requireAuth, imagesUpload, ...)
 */
export function imagesUpload(req, res, next) {
  upload.array("images", MAX_FILES)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      // File-size / count / unexpected-field violations
      const messageByCode = {
        LIMIT_FILE_SIZE: `Image too large (max ${MAX_BYTES / 1024 / 1024} MB)`,
        LIMIT_FILE_COUNT: `Too many images (max ${MAX_FILES})`,
        LIMIT_UNEXPECTED_FILE: "Unexpected file field — use `images`",
      };
      return res.status(400).json({
        error: {
          message: messageByCode[err.code] || err.message,
          status: 400,
        },
      });
    }

    // fileFilter throw
    return res.status(400).json({
      error: { message: err.message, status: 400 },
    });
  });
}
