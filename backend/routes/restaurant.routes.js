import { Router } from "express";

import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  suggestRestaurant,
  listPendingRestaurants,
  approveRestaurant,
  rejectRestaurant,
} from "../controllers/restaurant.controller.js";
import {
  validateCreateRestaurant,
  validateUpdateRestaurant,
} from "../validators/restaurant.validator.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireModerator } from "../middleware/requireModerator.js";
import { imagesUpload } from "../middleware/upload.js";
import { normalizeMultipartBody } from "../middleware/normalizeMultipartBody.js";

const router = Router();

router.get("/", getAllRestaurants);

// Suggestion workflow — MUST be registered before the `/:id` routes so
// literal segments like `/pending` and `/suggest` aren't captured by the
// param.
router.post(
  "/suggest",
  requireAuth,
  imagesUpload,
  normalizeMultipartBody,
  validateCreateRestaurant,
  suggestRestaurant
);
router.get(
  "/pending",
  requireAuth,
  requireModerator,
  listPendingRestaurants
);

router.get("/:id", getRestaurantById);

// Write endpoints — moderator only. All three previously accepted
// unauthenticated requests, which meant anyone could delete or edit a
// restaurant. The suggestion workflow (POST /suggest) stays open for
// any signed-in user.
router.post(
  "/",
  requireAuth,
  requireModerator,
  imagesUpload,
  normalizeMultipartBody,
  validateCreateRestaurant,
  createRestaurant
);
router.put(
  "/:id",
  requireAuth,
  requireModerator,
  imagesUpload,
  normalizeMultipartBody,
  validateUpdateRestaurant,
  updateRestaurant
);
router.delete("/:id", requireAuth, requireModerator, deleteRestaurant);

// Moderator approve / reject — routes are more specific than `/:id`
// alone, so ordering with the plain `/:id` routes doesn't matter here.
router.post("/:id/approve", requireAuth, requireModerator, approveRestaurant);
router.post("/:id/reject", requireAuth, requireModerator, rejectRestaurant);

export default router;
