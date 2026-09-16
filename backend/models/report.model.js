import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Polymorphic report record. Targets a Post OR a Comment via
 * (`targetType`, `targetId`). `targetType` is a string, not a ref, so the
 * schema stays simple; controllers/queue look up the right collection
 * based on the type.
 *
 * Access: only moderators can list reports; anyone signed in can create
 * one. Creating a report also `$inc`s `reportCount` on the target doc.
 */
const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: true } // spec asks for createdAt via timestamps
);

// Fast "reports for target X" and "recent reports" queries.
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
