import { clerkClient } from "@clerk/express";

import User from "../models/user.model.js";

/**
 * Pull the user's primary email out of a Clerk user object. Falls back to
 * the first listed email if the primary id doesn't match anything.
 */
function primaryEmailOf(clerkUser) {
  const list = clerkUser?.emailAddresses || [];
  const primary = list.find((e) => e.id === clerkUser.primaryEmailAddressId);
  return primary?.emailAddress || list[0]?.emailAddress || undefined;
}

function displayNameOf(clerkUser) {
  return (
    clerkUser?.fullName ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    undefined
  );
}

/**
 * Find our DB User for a given Clerk userId, or create one on first sight.
 *
 * Fetches the Clerk user record so we can snapshot email + name at
 * creation time. Uses upsert so two concurrent first-requests from the
 * same user don't race each other into a duplicate-key error.
 *
 * Returns the User doc.
 */
export async function getOrCreateUser(clerkUserId) {
  if (!clerkUserId) {
    throw new Error("getOrCreateUser: clerkUserId is required");
  }

  // Fast path — user already exists.
  const existing = await User.findOne({ clerkUserId });
  if (existing) return existing;

  // Slow path — fetch canonical email/name from Clerk, then upsert. We
  // use $setOnInsert so a lost race (concurrent create) doesn't overwrite
  // an existing row's data.
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = primaryEmailOf(clerkUser);
  const name = displayNameOf(clerkUser);

  const user = await User.findOneAndUpdate(
    { clerkUserId },
    { $setOnInsert: { clerkUserId, email, name } },
    { new: true, upsert: true, runValidators: true }
  );

  return user;
}
