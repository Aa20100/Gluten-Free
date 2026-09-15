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

const router = Router();

// Public: anyone can read a restaurant's reviews.
router.get("/restaurant/:restaurantId", getReviewsForRestaurant);

// Protected: everything below requires a signed-in user.
router.get("/me", requireAuth, getMyReviews);
router.post("/", requireAuth, validateCreateReview, createReview);
router.put("/:id", requireAuth, validateUpdateReview, updateReview);
router.delete("/:id", requireAuth, deleteReview);

export default router;
