import { Router } from "express";

import {
  getMe,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// All /users routes are protected — none of them make sense without a
// signed-in user.
router.get("/me", requireAuth, getMe);

router.get("/me/favorites", requireAuth, getFavorites);
router.post("/me/favorites/:restaurantId", requireAuth, addFavorite);
router.delete("/me/favorites/:restaurantId", requireAuth, removeFavorite);

export default router;
