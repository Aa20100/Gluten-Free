import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that require the user to be signed in. Browse-only routes
 * (/, /restaurants, /restaurants/[id], /forum) stay public; write-side
 * routes (posting, commenting, personal areas) are gated here.
 *
 * Add forum write routes as we build them. Reading the forum should
 * stay public.
 */
const isProtectedRoute = createRouteMatcher([
  "/profile(.*)",
  "/favorites(.*)",
  "/forum/new(.*)", // create a new thread — placeholder until the forum ships
  "/forum/(.*)/comment(.*)", // post a comment on a thread — placeholder
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // auth.protect() short-circuits unauthenticated requests: signed-out
    // users are redirected to Clerk's sign-in flow, then bounced back.
    await auth.protect();
  }
});

// Matcher config lifted from Clerk's Next.js quickstart: skip Next internals
// and static assets, but always run for /api and /trpc so route handlers
// can also read auth state.
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
