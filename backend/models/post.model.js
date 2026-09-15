import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Categories forum posts can belong to. Exported so validators/controllers
 * can reuse the list without redefining it, same convention as
 * RESTAURANT_TYPES on the Restaurant model.
 */
export const POST_CATEGORIES = [
  "newly_diagnosed",
  "restaurant_recommendations",
  "travel_tips",
  "recipes",
  "grocery_finds",
  "dining_questions",
  "cross_contamination_advice",
  "product_recommendations",
  "general_discussion",
];

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },

    // Author is the SafeBite DB User id (not the Clerk id). Controllers
    // map req.auth.userId → User via getOrCreateUser before writing.
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      enum: POST_CATEGORIES,
    },

    tags: { type: [String], default: [] },
    imageUrls: { type: [String], default: [] },

    // Vote tallies stored as arrays of User ids so we can:
    //   - dedupe naturally (a user's id appears at most once per array)
    //   - answer "did I vote on this?" without a separate join
    //   - compute the `score` virtual as upvotes.length - downvotes.length
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],

    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // Include virtuals in both JSON and plain-object serializations so
    // controllers can return `score` without extra plumbing.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual score — net vote count. Read-only, derived from arrays.
postSchema.virtual("score").get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

// Category + newest-first is the shape of the listing query when a
// category is picked; the compound index speeds that up.
postSchema.index({ category: 1, createdAt: -1 });
// Sort-by-date listing across all categories.
postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
