"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ModeratorOnly from "@/components/ModeratorOnly";
import { getRestaurants, deleteRestaurant } from "@/lib/api";

/**
 * Moderator hub for the approved restaurants collection.
 *
 * Shows every approved restaurant with per-row Edit + Delete. A name
 * search runs against the backend's `?name=` filter (case-insensitive
 * partial), and there's a prominent "Add new restaurant" button that
 * routes to /restaurants/new. Pending suggestions live at the sibling
 * page /moderation/restaurants.
 */
export default function ManageRestaurantsPage() {
  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
                Manage restaurants
              </h1>
              <p className="mt-2 text-stone-600">
                Edit or delete any approved restaurant, or add a new one
                directly.
              </p>
            </div>
            <Link
              href="/restaurants/new"
              className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
            >
              <span aria-hidden="true">＋</span>
              Add new restaurant
            </Link>
          </div>

          <p className="mt-1 text-xs text-stone-500">
            Looking for user-suggested restaurants awaiting review?{" "}
            <Link
              href="/moderation/restaurants"
              className="font-semibold text-orange-700 hover:text-orange-800"
            >
              Pending queue →
            </Link>
          </p>

          <ModeratorOnly>
            <ManageList />
          </ModeratorOnly>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function ManageList() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState(""); // form input
  const [activeQ, setActiveQ] = useState(""); // committed → sent to API
  const [state, setState] = useState({ status: "loading", data: [], error: null });

  // Re-fetch whenever the committed query changes. useState init already
  // covers the first-mount loading state, so no setState-in-effect needed.
  useEffect(() => {
    let cancelled = false;
    // Backend supports { name } as a case-insensitive partial match.
    getRestaurants(activeQ ? { name: activeQ } : {})
      .then((data) => !cancelled && setState({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setState({ status: "error", data: [], error }));
    return () => { cancelled = true; };
  }, [activeQ]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveQ(query.trim());
  };

  const handleDeleted = (id) => {
    setState((s) => ({
      ...s,
      data: s.data.filter((r) => String(r._id) !== String(id)),
    }));
  };

  return (
    <div className="mt-8">
      {/* Search */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex gap-2 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Search
        </button>
        {activeQ && (
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveQ(""); }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Body */}
      <div className="mt-4">
        {state.status === "loading" && (
          <p className="text-sm text-stone-500">Loading restaurants…</p>
        )}
        {state.status === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm">
            <p className="font-semibold text-red-800">
              Couldn&apos;t load restaurants.
            </p>
            <p className="mt-1 text-red-700">
              {state.error?.message || "Unknown error"}
            </p>
          </div>
        )}
        {state.status === "success" && state.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
            <p className="text-lg font-semibold text-stone-800">
              {activeQ ? "No matches" : "No restaurants yet"}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              {activeQ
                ? "Try a different search term."
                : "Use the Add button above to create the first one."}
            </p>
          </div>
        )}
        {state.status === "success" && state.data.length > 0 && (
          <>
            <p className="mb-2 text-xs text-stone-500">
              {state.data.length} restaurant{state.data.length === 1 ? "" : "s"}
            </p>
            <ul className="divide-y divide-orange-100 rounded-2xl border border-orange-100 bg-white shadow-sm">
              {state.data.map((r) => (
                <ManageRow
                  key={r._id}
                  restaurant={r}
                  getToken={getToken}
                  onDeleted={handleDeleted}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function ManageRow({ restaurant, getToken, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { _id, name, address, imageUrls } = restaurant;
  const cityState = address
    ? [address.city, address.state].filter(Boolean).join(", ")
    : "";
  const thumb = Array.isArray(imageUrls) ? imageUrls[0] : null;

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteRestaurant(_id, getToken);
      onDeleted(_id);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-orange-50 text-xl">
            🍽️
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/restaurants/${_id}`}
            className="block truncate text-base font-semibold text-stone-900 hover:text-orange-800"
          >
            {name}
          </Link>
          {cityState && (
            <p className="text-xs text-stone-500">{cityState}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/restaurants/${_id}/edit`}
            className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error.message || "Delete failed."}
        </p>
      )}
    </li>
  );
}
