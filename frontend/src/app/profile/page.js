"use client";

import { useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

/**
 * Signed-in-only profile page. Middleware already guarantees the user is
 * authenticated by the time this component runs (unauthenticated requests
 * are redirected to Clerk's sign-in before we get here) — but useUser()
 * still needs a moment to hydrate on the client, so we render a small
 * loading state until `isLoaded`.
 */
export default function ProfilePage() {
  const { isLoaded, user } = useUser();

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Your profile
          </h1>

          <div className="mt-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
            {!isLoaded ? (
              <p className="text-stone-500">Loading your details…</p>
            ) : !user ? (
              // Defensive: shouldn't happen because middleware protects this
              // route, but stay graceful if Clerk state is unexpected.
              <p className="text-stone-500">You&apos;re not signed in.</p>
            ) : (
              <dl className="space-y-4">
                <Row term="Name">
                  {user.fullName ||
                    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </Row>
                <Row term="Email">
                  {user.primaryEmailAddress?.emailAddress || "—"}
                </Row>
              </dl>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Row({ term, children }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {term}
      </dt>
      <dd className="text-stone-800">{children}</dd>
    </div>
  );
}
