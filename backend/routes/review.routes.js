import { Router } from "express";

import {
  getReviewsForRestaurant,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
} from "../controllers/review.controller.js";
import {
  validateCreateReview,
  validateUpdateReview,
} from "../validators/review.validator.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { imagesUpload } from "../middleware/upload.js";
import { normalizeMultipartBody } from "../middleware/normalizeMultipartBody.js";

const router = Router();

// Public: anyone can read a restaurant's reviews.
router.get("/restaurant/:restaurantId", getReviewsForRestaurant);

// Protected: everything below requires a signed-in user.
router.get("/me", requireAuth, getMyReviews);

// Create + update accept JSON or multipart/form-data. When multipart,
// multer parses image files into req.files and non-file fields into
// req.body as strings; normalizeMultipartBody then re-parses `imageUrls`
// (a JSON string on edits) into an array before the validator inspects it.
router.post(
  "/",
  requireAuth,
  imagesUpload,
  normalizeMultipartBody,
  validateCreateReview,
  createReview
);
router.put(
  "/:id",
  requireAuth,
  imagesUpload,
  normalizeMultipartBody,
  validateUpdateReview,
  updateReview
);

router.delete("/:id", requireAuth, deleteReview);

export default router;
