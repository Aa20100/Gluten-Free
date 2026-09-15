import mongoose from "mongoose";

import Restaurant from "../models/restaurant.model.js";
import Review from "../models/review.model.js";

/**
 * Recompute and persist a restaurant's `averageRating` and `reviewCount`
 * from the current set of reviews. Called after any create / update /
 * delete of a review so the aggregate stays in sync.
 *
 * Uses a single aggregation pipeline (one round-trip) rather than
 * fetching all reviews and averaging in JS — cheap even when a
 * restaurant collects thousands of reviews.
 *
 * Returns the updated Restaurant doc (or null if the restaurant no
 * longer exists).
 */
export async function recomputeRestaurantRating(restaurantId) {
  const [agg] = await Review.aggregate([
    { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
    {
      $group: {
        _id: "$restaurant",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  // No reviews left → reset to zero rather than leaving the last-known
  // average lingering on the doc.
  const averageRating = agg?.averageRating ?? 0;
  const reviewCount = agg?.reviewCount ?? 0;

  return Restaurant.findByIdAndUpdate(
    restaurantId,
    { averageRating, reviewCount },
    { new: true }
  );
}
