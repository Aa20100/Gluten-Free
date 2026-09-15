import mongoose from "mongoose";

import Review from "../models/review.model.js";
import Restaurant from "../models/restaurant.model.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { recomputeRestaurantRating } from "../utils/recomputeRestaurantRating.js";

// ────────────────────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────────────────────

function badId(res, id) {
  return res.status(400).json({
    error: { message: `Invalid id: ${id}`, status: 400 },
  });
}

function notFound(res, what, id) {
  return res.status(404).json({
    error: { message: `${what} not found: ${id}`, status: 404 },
  });
}

function forbidden(res, message = "Not allowed") {
  return res.status(403).json({
    error: { message, status: 403 },
  });
}

// Reviews always include the reviewer's display name; that's the only
// User field the UI needs for listings, so lean on lean() + a projected
// populate rather than fetching whole User docs.
const USER_POPULATE = { path: "user", select: "name" };
const RESTAURANT_POPULATE = { path: "restaurant", select: "name address imageUrl" };

// ────────────────────────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────────────────────────

/** GET /api/reviews/restaurant/:restaurantId  — public */
export async function getReviewsForRestaurant(req, res, next) {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.isValidObjectId(restaurantId)) return badId(res, restaurantId);

    const reviews = await Review.find({ restaurant: restaurantId })
      .sort({ createdAt: -1 })
      .populate(USER_POPULATE);

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

/** POST /api/reviews  — protected */
export async function createReview(req, res, next) {
  try {
    const { restaurant, rating, text } = req.body;

    if (!mongoose.isValidObjectId(restaurant)) return badId(res, restaurant);

    // Confirm the restaurant exists before we write anything.
    const restaurantDoc = await Restaurant.findById(restaurant);
    if (!restaurantDoc) return notFound(res, "Restaurant", restaurant);

    // Map the Clerk user to our DB user (auto-creates on first hit).
    const user = await getOrCreateUser(req.auth.userId);

    let created;
    try {
      created = await Review.create({
        user: user._id,
        restaurant,
        rating,
        text,
      });
    } catch (err) {
      // Compound-unique violation: this user already reviewed this
      // restaurant. Surface a clean 409 rather than a raw duplicate-key
      // error from Mongo.
      if (err?.code === 11000) {
        return res.status(409).json({
          error: {
            message: "You have already reviewed this restaurant",
            status: 409,
          },
        });
      }
      throw err;
    }

    await recomputeRestaurantRating(restaurant);

    // Return the created review populated the same way listings return
    // them, so the client can drop it straight into a list.
    const populated = await Review.findById(created._id).populate(USER_POPULATE);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/reviews/:id  — protected + ownership-checked */
export async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const review = await Review.findById(id);
    if (!review) return notFound(res, "Review", id);

    // Ownership check: the review must belong to the calling user.
    const user = await getOrCreateUser(req.auth.userId);
    if (!review.user.equals(user._id)) {
      return forbidden(res, "You can only edit your own reviews");
    }

    // Only apply fields that were sent (partial update). Validator has
    // already ensured any sent values are well-formed.
    if ("rating" in req.body) review.rating = req.body.rating;
    if ("text" in req.body) review.text = req.body.text;

    await review.save();
    await recomputeRestaurantRating(review.restaurant);

    const populated = await Review.findById(review._id).populate(USER_POPULATE);
    res.json(populated);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/reviews/:id  — protected + ownership-checked */
export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const review = await Review.findById(id);
    if (!review) return notFound(res, "Review", id);

    const user = await getOrCreateUser(req.auth.userId);
    if (!review.user.equals(user._id)) {
      return forbidden(res, "You can only delete your own reviews");
    }

    const restaurantId = review.restaurant;
    await review.deleteOne();
    await recomputeRestaurantRating(restaurantId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/reviews/me  — protected */
export async function getMyReviews(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);

    const reviews = await Review.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate(RESTAURANT_POPULATE);

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}
