import { getOrCreateUser } from "../utils/getOrCreateUser.js";

/**
 * GET /api/users/me
 *
 * Protected — requireAuth has already verified the Clerk session and
 * populated req.auth.userId by the time we get here.
 *
 * Returns the current user's DB record, creating it on the fly if this is
 * the first time we've seen this Clerk user.
 */
export async function getMe(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
