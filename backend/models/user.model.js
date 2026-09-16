import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    // Clerk's stable, opaque user id (e.g. "user_2abc..."). This is what
    // ties a request's `req.auth.userId` to a row in our DB. Unique +
    // indexed because every lookup goes through it.
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Snapshot of the user's email + name at the moment we first saw them.
    // Not the source of truth (Clerk is) — we can re-sync via webhooks
    // later. Present so joins/exports don't have to hit Clerk on every
    // read.
    email: { type: String },
    name: { type: String },

    // Coarse role. Only "moderator" gets pin / lock / moderator-delete
    // + reports listing. Promotion is manual (Mongo shell / a dashboard
    // we haven't built) — no self-service endpoint.
    role: {
      type: String,
      enum: ["user", "moderator"],
      default: "user",
    },

    // Restaurants the user has favorited. Ref lets us .populate() later.
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: "Restaurant",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
