"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StarRating from "@/components/StarRating";
import {
  getRestaurantById,
  getReviewsForRestaurant,
  getFavorites,
  addFavorite,
  removeFavorite,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
} from "@/lib/api";

// ── Labels ──────────────────────────────────────────────────────────────

const DIETARY_LABELS = {
  glutenFree: "Gluten-Free",
  dairyFree: "Dairy-Free",
  eggFree: "Egg-Free",
  nutFree: "Nut-Free",
  peanutFree: "Peanut-Free",
  treeNutFree: "Tree-Nut-Free",
  soyFree: "Soy-Free",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  shellfishFree: "Shellfish-Free",
  sesameFree: "Sesame-Free",
};

const FEATURE_LABELS = {
  dedicatedGfKitchen: "Dedicated GF Kitchen",
  separateFryer: "Dedicated Fryer",
  gfMenu: "Dedicated GF Menu",
  gfDesserts: "GF Desserts",
  certifiedGlutenFree: "Certified Gluten-Free",
  staffTrainedForCeliac: "Staff Trained for Celiac",
  crossContaminationPrecautions: "Cross-Contact Precautions",
};

const RESTAURANT_TYPE_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  bakery: "Bakery",
  coffee_shop: "Coffee Shop",
  fast_food: "Fast Food",
  dessert: "Dessert",
  fine_dining: "Fine Dining",
};

// ── Formatting helpers ─────────────────────────────────────────────────

function activeFlags(obj, labels) {
  if (!obj) return [];
  return Object.entries(labels)
    .filter(([key]) => obj[key])
    .map(([, label]) => label);
}

function formatAddress(address) {
  if (!address) return null;
  const line1 = address.street;
  const line2 = [address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ")
    .trim();
  const line3 = address.country;
  return [line1, line2, line3].filter(Boolean);
}

function normalizeWebsite(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function mapsHrefFor(restaurant) {
  const coords = restaurant?.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === "number") {
    const [lng, lat] = coords;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const a = restaurant?.address;
  if (a) {
    const q = [restaurant.name, a.street, a.city, a.state, a.zip]
      .filter(Boolean)
      .join(", ");
    if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  return null;
}

function relativeDate(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

export default function RestaurantDetailPage({ params }) {
  // Next 15+ hands `params` as a Promise even to client components — `use()`
  // unwraps it. In Next 16 accessing it directly throws a deprecation error.
  const { id } = use(params);

  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [restaurant, setRestaurant] = useState({ status: "loading", data: null, error: null });
  const [reviews, setReviews] = useState({ status: "loading", data: [], error: null });
  const [favorites, setFavorites] = useState({ status: "idle", ids: new Set(), error: null });
  const [myReview, setMyReview] = useState({ status: "idle", data: null });

  // ── Fetch restaurant ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setRestaurant({ status: "loading", data: null, error: null });
    getRestaurantById(id)
      .then((data) => !cancelled && setRestaurant({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setRestaurant({ status: "error", data: null, error }));
    return () => { cancelled = true; };
  }, [id]);

  // ── Fetch reviews ───────────────────────────────────────────────────
  const reloadReviews = useCallback(() => {
    let cancelled = false;
    setReviews((s) => ({ ...s, status: "loading" }));
    getReviewsForRestaurant(id)
      .then((data) => !cancelled && setReviews({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setReviews({ status: "error", data: [], error }));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => reloadReviews(), [reloadReviews]);

  // ── Auth-only: favorites + my-review-for-this-restaurant ────────────
  useEffect(() => {
    if (!userLoaded) return;
    if (!isSignedIn) {
      setFavorites({ status: "signed-out", ids: new Set(), error: null });
      setMyReview({ status: "signed-out", data: null });
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const favs = await getFavorites(getToken);
        if (cancelled) return;
        setFavorites({
          status: "success",
          ids: new Set(favs.map((r) => String(r._id))),
          error: null,
        });
      } catch (error) {
        if (!cancelled) setFavorites({ status: "error", ids: new Set(), error });
      }
    })();

    (async () => {
      try {
        const mine = await getMyReviews(getToken);
        if (cancelled) return;
        const found = mine.find((r) => String(r.restaurant?._id) === String(id)) || null;
        setMyReview({ status: "success", data: found });
      } catch {
        if (!cancelled) setMyReview({ status: "success", data: null });
      }
    })();

    return () => { cancelled = true; };
  }, [userLoaded, isSignedIn, getToken, id]);

  const handleToggleFavorite = async () => {
    if (!isSignedIn) return; // SignInButton handles the signed-out click
    const isFav = favorites.ids.has(String(id));
    // Optimistic — bump the set immediately, roll back on error.
    setFavorites((s) => {
      const next = new Set(s.ids);
      if (isFav) next.delete(String(id));
      else next.add(String(id));
      return { ...s, ids: next };
    });
    try {
      const updated = isFav
        ? await removeFavorite(getToken, id)
        : await addFavorite(getToken, id);
      setFavorites({
        status: "success",
        ids: new Set(updated.map((r) => String(r._id))),
        error: null,
      });
    } catch (error) {
      setFavorites((s) => {
        const rolled = new Set(s.ids);
        if (isFav) rolled.add(String(id));
        else rolled.delete(String(id));
        return { ...s, ids: rolled, error };
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <span aria-hidden="true">←</span>
            Back to restaurants
          </Link>

          {restaurant.status === "loading" && <DetailSkeleton />}
          {restaurant.status === "error" && (
            <ErrorCard
              message="Couldn't load this restaurant."
              detail={restaurant.error?.message}
              is404={restaurant.error?.status === 404 || restaurant.error?.status === 400}
            />
          )}
          {restaurant.status === "success" && restaurant.data && (
            <RestaurantDetail
              restaurant={restaurant.data}
              isSignedIn={isSignedIn}
              userLoaded={userLoaded}
              isFavorite={favorites.ids.has(String(id))}
              onToggleFavorite={handleToggleFavorite}
              reviews={reviews}
              myReview={myReview}
              onReviewsChanged={reloadReviews}
              onMyReviewChanged={(newValue) => setMyReview({ status: "success", data: newValue })}
              getToken={getToken}
              restaurantId={id}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Restaurant detail body
// ────────────────────────────────────────────────────────────────────────

function RestaurantDetail({
  restaurant,
  isSignedIn,
  userLoaded,
  isFavorite,
  onToggleFavorite,
  reviews,
  myReview,
  onReviewsChanged,
  onMyReviewChanged,
  getToken,
  restaurantId,
}) {
  const {
    name,
    description,
    address,
    phone,
    website,
    imageUrl,
    cuisine = [],
    restaurantType = [],
    dietary,
    features,
    averageRating = 0,
    reviewCount = 0,
  } = restaurant;

  const dietaryFlags = activeFlags(dietary, DIETARY_LABELS);
  const featureFlags = activeFlags(features, FEATURE_LABELS);
  const typeLabels = restaurantType
    .map((t) => RESTAURANT_TYPE_LABELS[t] || t)
    .filter(Boolean);
  const addressLines = formatAddress(address);
  const websiteHref = normalizeWebsite(website);
  const cityState = address
    ? [address.city, address.state].filter(Boolean).join(", ")
    : "";
  const mapsHref = mapsHrefFor(restaurant);

  return (
    <>
      {/* Hero */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-56 w-full object-cover sm:h-72"
          />
        ) : (
          <div className="flex h-56 items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 text-6xl sm:h-72">
            🍽️
          </div>
        )}

        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              {name}
            </h1>
            {cityState && (
              <p className="mt-2 text-stone-600">
                <span aria-hidden="true">📍 </span>
                {cityState}
              </p>
            )}
            {(typeLabels.length > 0 || cuisine.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {typeLabels.map((t) => (
                  <span
                    key={`type-${t}`}
                    className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800"
                  >
                    {t}
                  </span>
                ))}
                {cuisine.map((c) => (
                  <span
                    key={`cuisine-${c}`}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            {reviewCount > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <StarRating value={averageRating} size="md" />
                  <span className="text-lg font-bold text-stone-900">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-500">No reviews yet</p>
            )}
            <FavoriteButton
              isSignedIn={isSignedIn}
              userLoaded={userLoaded}
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
            />
          </div>
        </div>
      </div>

      {/* About */}
      {description && (
        <Section title="About">
          <p className="text-stone-700">{description}</p>
        </Section>
      )}

      {/* Two-column detail grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Celiac-Safety Features">
          {featureFlags.length > 0 ? (
            <ul className="space-y-2">
              {featureFlags.map((label) => (
                <li key={label} className="flex items-center gap-2 text-stone-800">
                  <CheckMark />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine>No safety features listed.</EmptyLine>
          )}
        </Section>

        <Section title="Dietary Options">
          {dietaryFlags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dietaryFlags.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <EmptyLine>No dietary options listed.</EmptyLine>
          )}
        </Section>

        <Section title="Contact">
          <dl className="space-y-3 text-sm">
            {phone && (
              <DlRow term="Phone">
                <a href={`tel:${phone}`} className="text-orange-700 hover:text-orange-800">
                  {phone}
                </a>
              </DlRow>
            )}
            {websiteHref && (
              <DlRow term="Website">
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-orange-700 hover:text-orange-800"
                >
                  {website}
                </a>
              </DlRow>
            )}
            {!phone && !websiteHref && <EmptyLine>No contact info on file.</EmptyLine>}
          </dl>
        </Section>

        <Section title="Address">
          {addressLines && addressLines.length > 0 ? (
            <address className="not-italic text-stone-700">
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : (
            <EmptyLine>No address on file.</EmptyLine>
          )}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
            >
              <span aria-hidden="true">🗺️</span>
              View on Google Maps
            </a>
          )}
        </Section>
      </div>

      {/* Reviews */}
      <ReviewsSection
        restaurantId={restaurantId}
        reviews={reviews}
        isSignedIn={isSignedIn}
        userLoaded={userLoaded}
        myReview={myReview}
        onReviewsChanged={onReviewsChanged}
        onMyReviewChanged={onMyReviewChanged}
        getToken={getToken}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Favorite button (signed-in toggles, signed-out opens sign-in modal)
// ────────────────────────────────────────────────────────────────────────

function FavoriteButton({ isSignedIn, userLoaded, isFavorite, onToggle }) {
  // Until Clerk hydrates, disable the button so the label can't flicker.
  const disabled = !userLoaded;
  const baseClasses =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50";

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          disabled={disabled}
          className={`${baseClasses} border-orange-300 bg-white text-orange-700 hover:bg-orange-50`}
        >
          <span aria-hidden="true">🤍</span>
          Save to favorites
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isFavorite}
      className={
        isFavorite
          ? `${baseClasses} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`
          : `${baseClasses} border-orange-300 bg-white text-orange-700 hover:bg-orange-50`
      }
    >
      <span aria-hidden="true">{isFavorite ? "❤️" : "🤍"}</span>
      {isFavorite ? "Saved" : "Save to favorites"}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Reviews section
// ────────────────────────────────────────────────────────────────────────

function ReviewsSection({
  restaurantId,
  reviews,
  isSignedIn,
  userLoaded,
  myReview,
  onReviewsChanged,
  onMyReviewChanged,
  getToken,
}) {
  return (
    <section className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-stone-900">Reviews</h2>

      {/* Sign-in prompt */}
      {userLoaded && !isSignedIn && (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <p>Sign in to share your experience at this restaurant.</p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Sign in to review
            </button>
          </SignInButton>
        </div>
      )}

      {/* Own review form (create or edit) */}
      {userLoaded && isSignedIn && (
        <MyReviewForm
          key={myReview.data?._id || "new"}
          existing={myReview.data}
          restaurantId={restaurantId}
          getToken={getToken}
          onSaved={(saved) => {
            onMyReviewChanged(saved);
            onReviewsChanged();
          }}
          onDeleted={() => {
            onMyReviewChanged(null);
            onReviewsChanged();
          }}
        />
      )}

      {/* Reviews list */}
      <div className="mt-6">
        {reviews.status === "loading" && <EmptyLine>Loading reviews…</EmptyLine>}
        {reviews.status === "error" && (
          <ErrorCard inline message="Couldn't load reviews." detail={reviews.error?.message} />
        )}
        {reviews.status === "success" && reviews.data.length === 0 && (
          <EmptyLine>No reviews yet. Be the first!</EmptyLine>
        )}
        {reviews.status === "success" && reviews.data.length > 0 && (
          <ul className="space-y-4">
            {reviews.data.map((r) => (
              <ReviewItem key={r._id} review={r} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReviewItem({ review }) {
  return (
    <li className="rounded-xl border border-orange-100 bg-amber-50/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-900">
            {review.user?.name || "Anonymous"}
          </span>
          <StarRating value={review.rating} size="sm" />
        </div>
        <span className="text-xs text-stone-500">{relativeDate(review.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-stone-800">{review.text}</p>
    </li>
  );
}

function MyReviewForm({ existing, restaurantId, getToken, onSaved, onDeleted }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [text, setText] = useState(existing?.text || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = Boolean(existing);

  const canSubmit = rating >= 1 && rating <= 5 && text.trim().length > 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = isEditing
        ? await updateReview(getToken, existing._id, { rating, text: text.trim() })
        : await createReview(getToken, { restaurant: restaurantId, rating, text: text.trim() });
      onSaved(saved);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!window.confirm("Delete your review?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteReview(getToken, existing._id);
      onDeleted();
      setRating(0);
      setText("");
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600">
          {isEditing ? "Your review" : "Write a review"}
        </h3>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="text-xs font-semibold text-red-700 hover:text-red-800 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm font-medium text-stone-700">Rating</span>
        <StarRating value={rating} onChange={setRating} size="lg" />
        <span className="text-sm text-stone-500">
          {rating > 0 ? `${rating}/5` : "Pick a rating"}
        </span>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Review text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How was the gluten-free experience?"
          rows={4}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </label>

      {error && (
        <p className="mt-2 text-sm text-red-700">
          {error.message || "Something went wrong."}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEditing ? "Save changes" : "Post review"}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Small primitives
// ────────────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-4 text-lg font-bold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

function DlRow({ term, children }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {term}
      </dt>
      <dd className="text-stone-800">{children}</dd>
    </div>
  );
}

function EmptyLine({ children }) {
  return <p className="text-sm text-stone-500">{children}</p>;
}

function CheckMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
    >
      ✓
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-6">
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="h-56 bg-orange-50 sm:h-72" />
        <div className="space-y-3 p-8">
          <div className="h-7 w-2/3 rounded bg-stone-200" />
          <div className="h-4 w-1/3 rounded bg-stone-100" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-orange-100" />
            <div className="h-6 w-20 rounded-full bg-amber-100" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
            <div className="mb-4 h-5 w-1/3 rounded bg-stone-200" />
            <div className="h-4 w-2/3 rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message, detail, is404, inline }) {
  if (is404) {
    return (
      <div
        className={`${inline ? "" : "mt-8"} rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center`}
      >
        <p className="text-5xl" aria-hidden="true">🍽️</p>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Restaurant not found</h1>
        <p className="mt-2 text-stone-600">
          We couldn&apos;t find that restaurant. It may have been removed, or the link may be incorrect.
        </p>
        <Link
          href="/restaurants"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Browse restaurants
        </Link>
      </div>
    );
  }
  return (
    <div className={`${inline ? "" : "mt-8"} rounded-2xl border border-red-200 bg-red-50 p-6`}>
      <p className="font-semibold text-red-800">{message}</p>
      {detail && <p className="mt-2 text-sm text-red-700">{detail}</p>}
    </div>
  );
}
