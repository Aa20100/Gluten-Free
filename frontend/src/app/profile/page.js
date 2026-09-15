"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";
import StarRating from "@/components/StarRating";
import { getMe, getFavorites, getMyReviews } from "@/lib/api";

export default function ProfilePage() {
  const { isLoaded: userLoaded, user } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();

  const [db, setDb] = useState({ status: "loading", data: null, error: null });
  const [favorites, setFavorites] = useState({ status: "loading", data: [], error: null });
  const [myReviews, setMyReviews] = useState({ status: "loading", data: [], error: null });

  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;

    // Kick off all three requests in parallel. Each has its own state slot
    // so a failure in one doesn't wipe out the others.
    (async () => {
      try {
        const data = await getMe(getToken);
        if (!cancelled) setDb({ status: "success", data, error: null });
      } catch (error) {
        if (!cancelled) setDb({ status: "error", data: null, error });
      }
    })();

    (async () => {
      try {
        const data = await getFavorites(getToken);
        if (!cancelled) setFavorites({ status: "success", data, error: null });
      } catch (error) {
        if (!cancelled) setFavorites({ status: "error", data: [], error });
      }
    })();

    (async () => {
      try {
        const data = await getMyReviews(getToken);
        if (!cancelled) setMyReviews({ status: "success", data, error: null });
      } catch (error) {
        if (!cancelled) setMyReviews({ status: "error", data: [], error });
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded]);

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Your profile
          </h1>

          {/* Clerk identity */}
          <Section title="Account">
            {!userLoaded ? (
              <Line muted>Loading your details…</Line>
            ) : !user ? (
              <Line muted>You&apos;re not signed in.</Line>
            ) : (
              <dl className="space-y-3">
                <Row term="Name">
                  {user.fullName ||
                    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </Row>
                <Row term="Email">
                  {user.primaryEmailAddress?.emailAddress || "—"}
                </Row>
                {db.status === "success" && db.data.createdAt && (
                  <Row term="Member since">
                    {new Date(db.data.createdAt).toLocaleDateString()}
                  </Row>
                )}
              </dl>
            )}
            {db.status === "error" && (
              <p className="mt-3 text-sm text-red-700">
                Couldn&apos;t load your SafeBite record: {db.error?.message}
              </p>
            )}
          </Section>

          {/* Favorites */}
          <Section title="Your favorites">
            {favorites.status === "loading" && (
              <CardGridSkeleton />
            )}
            {favorites.status === "error" && (
              <ErrorLine detail={favorites.error?.message}>
                Couldn&apos;t load your favorites.
              </ErrorLine>
            )}
            {favorites.status === "success" && favorites.data.length === 0 && (
              <EmptyState
                title="You haven't saved any restaurants yet"
                hint="Tap the heart on any restaurant to save it here."
                cta={{ label: "Browse restaurants", href: "/restaurants" }}
              />
            )}
            {favorites.status === "success" && favorites.data.length > 0 && (
              <>
                <p className="mb-4 text-sm text-stone-500">
                  {favorites.data.length} saved
                </p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {favorites.data.map((r) => (
                    <RestaurantCard key={r._id} restaurant={r} />
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* My Reviews */}
          <Section title="My reviews">
            {myReviews.status === "loading" && (
              <ReviewsSkeleton />
            )}
            {myReviews.status === "error" && (
              <ErrorLine detail={myReviews.error?.message}>
                Couldn&apos;t load your reviews.
              </ErrorLine>
            )}
            {myReviews.status === "success" && myReviews.data.length === 0 && (
              <EmptyState
                title="You haven't written any reviews yet"
                hint="Share your experience on any restaurant's page."
                cta={{ label: "Browse restaurants", href: "/restaurants" }}
              />
            )}
            {myReviews.status === "success" && myReviews.data.length > 0 && (
              <ul className="divide-y divide-orange-100">
                {myReviews.data.map((r) => (
                  <MyReviewRow key={r._id} review={r} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

function MyReviewRow({ review }) {
  const r = review.restaurant;
  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          {r?._id ? (
            <Link
              href={`/restaurants/${r._id}`}
              className="text-base font-semibold text-stone-900 hover:text-orange-800"
            >
              {r.name || "Untitled restaurant"}
            </Link>
          ) : (
            <span className="text-base font-semibold text-stone-900">
              {r?.name || "Untitled restaurant"}
            </span>
          )}
          {r?.address?.city && r?.address?.state && (
            <span className="text-xs text-stone-500">
              {r.address.city}, {r.address.state}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StarRating value={review.rating} size="sm" />
          <span className="text-xs text-stone-500">
            {review.createdAt
              ? new Date(review.createdAt).toLocaleDateString()
              : ""}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-stone-700">
          {review.text}
        </p>
      </div>
      {r?._id && (
        <Link
          href={`/restaurants/${r._id}`}
          className="shrink-0 text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          View & edit →
        </Link>
      )}
    </li>
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
    <p className={(muted ? "text-stone-500 " : "text-stone-800 ") + className}>
      {children}
    </p>
  );
}

function ErrorLine({ children, detail }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
      <p className="font-semibold text-red-800">{children}</p>
      {detail && <p className="mt-1 text-red-700">{detail}</p>}
    </div>
  );
}

function EmptyState({ title, hint, cta }) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center">
      <p className="text-lg font-semibold text-stone-800">{title}</p>
      {hint && <p className="mt-2 text-sm text-stone-600">{hint}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
        >
          <div className="h-40 bg-orange-50" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 rounded bg-stone-200" />
            <div className="h-4 w-1/3 rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <ul className="animate-pulse divide-y divide-orange-100">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="space-y-2 py-4">
          <div className="h-4 w-1/3 rounded bg-stone-200" />
          <div className="h-3 w-1/4 rounded bg-stone-100" />
          <div className="h-3 w-full rounded bg-stone-100" />
        </li>
      ))}
    </ul>
  );
}
