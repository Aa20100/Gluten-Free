"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getMe } from "@/lib/api";

/**
 * Signed-in-only profile page. Middleware already guarantees the request
 * is authenticated by the time this renders. Two data sources:
 *
 * - Clerk (`useUser`) — the authoritative identity, immediately available
 *   on the client after hydration.
 * - Our backend DB (`GET /api/users/me`) — the row created lazily on the
 *   first authed request. We fetch this to prove the frontend → Clerk →
 *   backend → Mongo round-trip works.
 */
export default function ProfilePage() {
  const { isLoaded: userLoaded, user } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();

  const [db, setDb] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    // Wait until Clerk has hydrated so getToken() actually resolves.
    if (!authLoaded) return;
    let cancelled = false;

    getMe(getToken)
      .then((data) => {
        if (!cancelled) setDb({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setDb({ status: "error", data: null, error });
      });

    return () => {
      cancelled = true;
    };
    // getToken from useAuth is stable across renders per Clerk's design;
    // we only re-run when auth loads. eslint doesn't know that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded]);

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Your profile
          </h1>

          {/* Clerk identity — always available once useUser has loaded. */}
          <Section title="Account (from Clerk)">
            {!userLoaded ? (
              <Line muted>Loading your details…</Line>
            ) : !user ? (
              <Line muted>You&apos;re not signed in.</Line>
            ) : (
              <dl className="space-y-3">
                <Row term="Name">
                  {user.fullName ||
                    [user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "—"}
                </Row>
                <Row term="Email">
                  {user.primaryEmailAddress?.emailAddress || "—"}
                </Row>
              </dl>
            )}
          </Section>

          {/* Backend DB record — proves the auth round-trip works. */}
          <Section title="SafeBite record (from our backend)">
            {db.status === "loading" && <Line muted>Loading from API…</Line>}
            {db.status === "error" && (
              <div className="space-y-2 text-sm">
                <Line className="font-semibold text-red-700">
                  Couldn&apos;t load your SafeBite record.
                </Line>
                <Line muted>{db.error?.message || "Unknown error"}</Line>
                <Line muted>
                  Make sure the backend is running and{" "}
                  <code className="rounded bg-stone-100 px-1">
                    CLERK_PUBLISHABLE_KEY
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-stone-100 px-1">
                    CLERK_SECRET_KEY
                  </code>{" "}
                  are set in <code className="rounded bg-stone-100 px-1">backend/.env</code>.
                </Line>
              </div>
            )}
            {db.status === "success" && (
              <dl className="space-y-3">
                <Row term="Favorites">
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-800">
                      {db.data.favorites?.length ?? 0}
                    </span>
                    <span className="text-sm text-stone-500">
                      restaurant{db.data.favorites?.length === 1 ? "" : "s"} saved
                    </span>
                  </span>
                </Row>
                <Row term="DB Email">{db.data.email || "—"}</Row>
                <Row term="DB Name">{db.data.name || "—"}</Row>
                <Row term="Member since">
                  {db.data.createdAt
                    ? new Date(db.data.createdAt).toLocaleDateString()
                    : "—"}
                </Row>
              </dl>
            )}
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {children}
    </section>
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

function Line({ children, muted, className = "" }) {
  return (
    <p
      className={
        (muted ? "text-stone-500 " : "text-stone-800 ") + className
      }
    >
      {children}
    </p>
  );
}
