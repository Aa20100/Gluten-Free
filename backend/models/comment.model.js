import mongoose from "mongoose";

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // null = top-level comment; otherwise ObjectId of the parent comment.
    // We keep replies as full docs so the frontend can nest them client-side.
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    body: { type: String, required: true },

    likes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],

    reportCount: { type: Number, default: 0 },

    // Soft-delete flag. When true, controllers hide the author identity in
    // the response and the body is set to a "[deleted]" placeholder — the
    // doc itself stays so any child replies keep their parent link.
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The dominant read path is "all comments for a post, oldest first."
// Compound index gives that a covered sort on (post, createdAt).
commentSchema.index({ post: 1, createdAt: 1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
