"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getMe,
  listPendingRestaurants,
  approveRestaurant,
  rejectRestaurant,
} from "@/lib/api";

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function PendingRestaurantsPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();

  const [role, setRole] = useState({ status: "loading", isMod: false, error: null });
  const [items, setItems] = useState({ status: "idle", data: [], error: null });

  // Middleware ensures sign-in; page then checks role client-side so
  // non-moderators get a friendly panel instead of a 403 dump.
  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn) return;
    let cancelled = false;
    getMe(getToken)
      .then((me) => {
        if (cancelled) return;
        setRole({
          status: "success",
          isMod: me?.role === "moderator",
          error: null,
        });
      })
      .catch((error) => !cancelled && setRole({ status: "error", isMod: false, error }));
    return () => { cancelled = true; };
  }, [authLoaded, userLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (role.status !== "success" || !role.isMod) return;
    let cancelled = false;
    listPendingRestaurants(getToken)
      .then((data) => !cancelled && setItems({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setItems({ status: "error", data: [], error }));
    return () => { cancelled = true; };
  }, [role, getToken]);

  const removeFromList = (id) => {
    setItems((s) => ({
      ...s,
      data: s.data.filter((r) => String(r._id) !== String(id)),
    }));
  };

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Pending restaurants
          </h1>
          <p className="mt-2 text-stone-600">
            User-submitted restaurants awaiting a moderator&apos;s review.
          </p>

          {role.status === "loading" && (
            <p className="mt-8 text-stone-500">Checking your access…</p>
          )}

          {role.status === "success" && !role.isMod && (
            <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center">
              <p className="text-5xl" aria-hidden="true">🛡</p>
              <h2 className="mt-4 text-xl font-bold text-stone-900">
                Moderators only
              </h2>
              <p className="mt-2 text-stone-600">
                Your account doesn&apos;t have moderator access.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Back to home
              </Link>
            </div>
          )}

          {role.status === "success" && role.isMod && (
            <div className="mt-8">
              {items.status === "idle" || items.status === "loading" ? (
                <p className="text-stone-500">Loading suggestions…</p>
              ) : items.status === "error" ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                  <p className="font-semibold text-red-800">
                    Couldn&apos;t load pending restaurants.
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {items.error?.message || "Unknown error"}
                  </p>
                </div>
              ) : items.data.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
                  <p className="text-lg font-semibold text-stone-800">
                    Inbox zero
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    No pending suggestions to review right now.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.data.map((r) => (
                    <li key={r._id}>
                      <PendingCard
                        restaurant={r}
                        getToken={getToken}
                        onDone={() => removeFromList(r._id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PendingCard({ restaurant, getToken, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const {
    _id,
    name,
    description,
    address,
    location,
    phone,
    website,
    cuisine = [],
    restaurantType = [],
    dietary,
    features,
    imageUrls = [],
    submittedBy,
    createdAt,
  } = restaurant;

  const handleApprove = async () => {
    setBusy(true);
    setError(null);
    try {
      await approveRestaurant(_id, getToken);
      onDone();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  const handleReject = async () => {
    if (!window.confirm("Reject this suggestion?")) return;
    setBusy(true);
    setError(null);
    try {
      await rejectRestaurant(_id, getToken);
      onDone();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const addressLine = address
    ? [address.street, address.city, address.state, address.zip, address.country]
        .filter(Boolean)
        .join(", ")
    : "";
  const dietaryFlags = dietary
    ? Object.entries(dietary).filter(([, v]) => v).map(([k]) => k)
    : [];
  const featureFlags = features
    ? Object.entries(features).filter(([, v]) => v).map(([k]) => k)
    : [];

  return (
    <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
              Pending
            </span>
            <span className="text-xs text-stone-500">
              submitted {formatDateTime(createdAt)}
              {submittedBy?.name && (
                <>
                  {" "}by <span className="font-medium text-stone-700">{submittedBy.name}</span>
                  {submittedBy.email && ` (${submittedBy.email})`}
                </>
              )}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-stone-900">{name}</h2>
          {description && (
            <p className="mt-2 whitespace-pre-line text-stone-700">{description}</p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {addressLine && <Row term="Address">{addressLine}</Row>}
        {location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2 && (
          <Row term="Coords">
            {location.coordinates[1]}, {location.coordinates[0]}
          </Row>
        )}
        {phone && <Row term="Phone">{phone}</Row>}
        {website && (
          <Row term="Website">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-orange-700 hover:text-orange-800"
            >
              {website}
            </a>
          </Row>
        )}
        {cuisine.length > 0 && <Row term="Cuisine">{cuisine.join(", ")}</Row>}
        {restaurantType.length > 0 && <Row term="Type">{restaurantType.join(", ")}</Row>}
        {dietaryFlags.length > 0 && <Row term="Dietary">{dietaryFlags.join(", ")}</Row>}
        {featureFlags.length > 0 && <Row term="Features">{featureFlags.join(", ")}</Row>}
      </dl>

      {imageUrls.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Suggested ${i + 1}`}
                  className="h-24 w-24 rounded-lg border border-stone-200 object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error.message || "Action failed."}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-orange-100 pt-4">
        <button
          type="button"
          onClick={handleReject}
          disabled={busy}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </article>
  );
}

function Row({ term, children }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {term}
      </dt>
      <dd className="min-w-0 flex-1 text-stone-800">{children}</dd>
    </div>
  );
}
