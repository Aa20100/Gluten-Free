import { getOrCreateUser } from "../utils/getOrCreateUser.js";

/**
 * Route guard for moderator-only actions. Runs AFTER `requireAuth`, so
 * `req.auth.userId` is guaranteed populated.
 *
 * Side-effect: attaches the DB `User` doc to `req.user` so the
 * downstream controller doesn't need to look it up again.
 *
 *   router.post("/:id/pin", requireAuth, requireModerator, pinPost);
 */
export async function requireModerator(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);
    if (user?.role !== "moderator") {
      return res.status(403).json({
        error: { message: "Moderator only", status: 403 },
      });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
