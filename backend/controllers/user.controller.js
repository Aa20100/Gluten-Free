import mongoose from "mongoose";

import Restaurant from "../models/restaurant.model.js";
import User from "../models/user.model.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

// The favorites listings return each restaurant with just enough for a
// card render — keeps payloads small.
const FAVORITES_POPULATE = {
  path: "favorites",
  select: "name address imageUrl features cuisine restaurantType averageRating reviewCount",
};

function badId(res, id) {
  return res.status(400).json({
    error: { message: `Invalid restaurant id: ${id}`, status: 400 },
  });
}

function notFound(res, what, id) {
  return res.status(404).json({
    error: { message: `${what} not found: ${id}`, status: 404 },
  });
}

/**
 * GET /api/users/me
 *
 * Protected — requireAuth has already verified the Clerk session and
 * populated req.auth.userId by the time we get here.
 *
 * Returns the current user's DB record with favorites populated so the
 * frontend can render saved restaurants directly. Creates the row on
 * first hit.
 */
export async function getMe(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);
    const populated = await User.findById(user._id).populate(FAVORITES_POPULATE);
    res.json(populated);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/me/favorites — protected */
export async function getFavorites(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);
    const populated = await User.findById(user._id).populate(FAVORITES_POPULATE);
    res.json(populated.favorites);
  } catch (err) {
    next(err);
  }
}

/** POST /api/users/me/favorites/:restaurantId — protected */
export async function addFavorite(req, res, next) {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.isValidObjectId(restaurantId)) return badId(res, restaurantId);

    // Confirm the restaurant exists — better to 404 here than silently
    // add a dangling ObjectId to the user's favorites.
    const restaurantExists = await Restaurant.exists({ _id: restaurantId });
    if (!restaurantExists) return notFound(res, "Restaurant", restaurantId);

    const user = await getOrCreateUser(req.auth.userId);

    // $addToSet dedupes — favoriting the same restaurant twice is a no-op.
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { favorites: restaurantId } },
      { new: true }
    ).populate(FAVORITES_POPULATE);

    res.json(updated.favorites);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/users/me/favorites/:restaurantId — protected */
export async function removeFavorite(req, res, next) {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.isValidObjectId(restaurantId)) return badId(res, restaurantId);

    const user = await getOrCreateUser(req.auth.userId);

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $pull: { favorites: restaurantId } },
      { new: true }
    ).populate(FAVORITES_POPULATE);

    res.json(updated.favorites);
  } catch (err) {
    next(err);
  }
}
