import { Router } from "express";

import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurant.controller.js";
import {
  validateCreateRestaurant,
  validateUpdateRestaurant,
} from "../validators/restaurant.validator.js";

const router = Router();

router.get("/", getAllRestaurants);
router.get("/:id", getRestaurantById);
router.post("/", validateCreateRestaurant, createRestaurant);
router.put("/:id", validateUpdateRestaurant, updateRestaurant);
router.delete("/:id", deleteRestaurant);

export default router;
