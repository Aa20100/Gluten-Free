"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";
import { getRestaurants } from "@/lib/api";

/** Fields the search form and query string both understand. */
const FILTER_KEYS = ["name", "city", "state", "zip"];

function paramsFromSearch(searchParams) {
  const out = {};
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function fillDefaults(params) {
  return {
    name: params.name || "",
    city: params.city || "",
    state: params.state || "",
    zip: params.zip || "",
  };
}

function SearchBar({ initialValues, onSubmit }) {
  // Local form state so typing doesn't cause a re-navigation on every keystroke.
  // The parent re-mounts this component (via key) when the URL changes, so
  // there's no need to sync `initialValues` back into state after mount.
  const [values, setValues] = useState(initialValues);

  const set = (key) => (e) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  const handleClear = () => {
    const cleared = { name: "", city: "", state: "", zip: "" };
    setValues(cleared);
    onSubmit(cleared);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          Name
          <input
            type="text"
            value={values.name}
            onChange={set("name")}
            placeholder="e.g. Bakehouse"
            className="rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          City
          <input
            type="text"
            value={values.city}
            onChange={set("city")}
            placeholder="e.g. Austin"
            className="rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          State
          <input
            type="text"
            value={values.state}
            onChange={set("state")}
            placeholder="e.g. TX"
            className="rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
          Zip
          <input
            type="text"
            value={values.zip}
            onChange={set("zip")}
            placeholder="e.g. 78704"
            className="rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Clear
        </button>
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}

/**
 * Fetches the restaurants for one specific set of params. Remounted (via
 * key) by the parent whenever the URL query changes, so it can initialize
 * its state as "loading" and never needs to setState synchronously in an
 * effect body.
 */
function ResultsPanel({ params }) {
  const [state, setState] = useState({
    status: "loading",
    data: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    getRestaurants(params)
      .then((data) => {
        if (cancelled) return;
        setState({ status: "success", data, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", data: [], error: err });
      });

    return () => {
      cancelled = true;
    };
    // `params` is stable for this component instance (see key on caller).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") return <LoadingGrid />;
  if (state.status === "error") return <ErrorState error={state.error} />;
  if (state.data.length === 0) {
    return <EmptyState hasFilters={Object.keys(params).length > 0} />;
  }

  return (
    <>
      <p className="mb-4 text-sm text-stone-500">
        {state.data.length} result{state.data.length === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {state.data.map((restaurant) => (
          <RestaurantCard key={restaurant._id} restaurant={restaurant} />
        ))}
      </div>
    </>
  );
}

function RestaurantsListing() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchKey = searchParams.toString();
  const activeParams = paramsFromSearch(searchParams);

  const handleSubmit = (values) => {
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const trimmed = (values[key] || "").trim();
      if (trimmed) next.set(key, trimmed);
    }
    const qs = next.toString();
    router.push(qs ? `/restaurants?${qs}` : "/restaurants");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Restaurants
        </h1>
        <p className="mt-2 text-stone-600">
          Search celiac-safe and allergen-friendly restaurants.
        </p>
      </div>

      {/* Keyed on searchKey so the form resets to the URL's values on nav. */}
      <SearchBar
        key={`form-${searchKey}`}
        initialValues={fillDefaults(activeParams)}
        onSubmit={handleSubmit}
      />

      <div className="mt-8">
        {/* Keyed on searchKey so a new URL triggers a fresh mount + fetch. */}
        <ResultsPanel key={`results-${searchKey}`} params={activeParams} />
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
        >
          <div className="h-40 bg-orange-50" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 rounded bg-stone-200" />
            <div className="h-4 w-1/3 rounded bg-stone-100" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-emerald-50" />
              <div className="h-5 w-20 rounded-full bg-emerald-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
      <p className="text-lg font-semibold text-stone-800">
        No restaurants found
      </p>
      <p className="mt-2 text-sm text-stone-600">
        {hasFilters
          ? "Try loosening your filters or searching a different city."
          : "There aren't any restaurants to show yet."}
      </p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <p className="font-semibold text-red-800">
        Something went wrong loading restaurants.
      </p>
      <p className="mt-2 text-sm text-red-700">
        {error?.message || "Unknown error"}
      </p>
      <p className="mt-3 text-xs text-red-600">
        Make sure the backend is running and NEXT_PUBLIC_API_URL points at it.
      </p>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        {/* useSearchParams requires a Suspense boundary in Next 15+. */}
        <Suspense fallback={<LoadingGrid />}>
          <RestaurantsListing />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
