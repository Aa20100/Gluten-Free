import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },

    // Cloudinary secure_urls attached by the reviewer. Validators cap
    // this at 5 items per doc.
    imageUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One review per user per restaurant. Unique enforces the rule at the DB
// level; the compound also speeds up "does this user already have a
// review for X?" lookups.
reviewSchema.index({ user: 1, restaurant: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
