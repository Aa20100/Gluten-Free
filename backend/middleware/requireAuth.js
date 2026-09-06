import { getAuth } from "@clerk/express";

/**
 * Per-route middleware: rejects the request with a 401 unless a valid Clerk
 * session was verified upstream by `clerkMiddleware()` (registered in
 * server.js). On success, attaches `req.auth` — populated with at least
 * `{ userId }` — and calls `next()`.
 *
 * `clerkMiddleware()` runs on every request and populates auth state on
 * `req`. This wrapper does the "must be signed in" check per-route so we
 * can gate individual endpoints without protecting the whole API.
 */
export function requireAuth(req, res, next) {
  // `getAuth(req)` throws if clerkMiddleware() wasn't registered upstream
  // (e.g. during setup before CLERK_SECRET_KEY is pasted in). Treat that
  // the same as an unauthenticated request — 401, not 500.
  let auth;
  try {
    auth = getAuth(req);
  } catch {
    auth = null;
  }

  if (!auth?.userId) {
    return res.status(401).json({
      error: {
        message: "Authentication required",
        status: 401,
      },
    });
  }

  // Standardize the shape controllers see. `auth` from Clerk also carries
  // sessionId, orgId, etc. — pass the full object through for later use.
  req.auth = auth;
  next();
}
