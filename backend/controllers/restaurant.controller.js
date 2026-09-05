import mongoose from "mongoose";
import Restaurant from "../models/restaurant.model.js";

/**
 * Escape a user-supplied string so it can be safely embedded in a RegExp
 * for case-insensitive partial matching (prevents ReDoS via unescaped
 * metacharacters).
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badId(res, id) {
  return res.status(400).json({
    error: { message: `Invalid restaurant id: ${id}`, status: 400 },
  });
}

function notFound(res, id) {
  return res.status(404).json({
    error: { message: `Restaurant not found: ${id}`, status: 404 },
  });
}

/**
 * GET /api/restaurants
 * Optional query params: name, city (case-insensitive partial match)
 *                        state, zip  (exact match)
 */
export async function getAllRestaurants(req, res, next) {
  try {
    const { name, city, state, zip } = req.query;
    const filter = {};

    if (name) {
      filter.name = { $regex: escapeRegex(name), $options: "i" };
    }
    if (city) {
      filter["address.city"] = { $regex: escapeRegex(city), $options: "i" };
    }
    if (state) {
      filter["address.state"] = state;
    }
    if (zip) {
      filter["address.zip"] = zip;
    }

    const restaurants = await Restaurant.find(filter).sort({ name: 1 });
    res.json(restaurants);
  } catch (err) {
    next(err);
  }
}

/** GET /api/restaurants/:id */
export async function getRestaurantById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return notFound(res, id);

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
}

/** POST /api/restaurants */
export async function createRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json(restaurant);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/restaurants/:id */
export async function updateRestaurant(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const restaurant = await Restaurant.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!restaurant) return notFound(res, id);

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/restaurants/:id */
export async function deleteRestaurant(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const restaurant = await Restaurant.findByIdAndDelete(id);
    if (!restaurant) return notFound(res, id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
