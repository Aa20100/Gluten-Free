"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";
import { getRestaurants } from "@/lib/api";

// ────────────────────────────────────────────────────────────────────────────
// URL / filter model
// ────────────────────────────────────────────────────────────────────────────

/** Free-text query params. Case-insensitive partial (name/city) or exact. */
const TEXT_KEYS = ["name", "city", "state", "zip"];

/** csv-array query params. Each is a section in the filter panel. */
const CATEGORY_KEYS = ["restaurantType", "dietary", "features"];

/**
 * Core dietary flag: always defaults to checked, visually emphasized, and
 * excluded from the "active filters" count so the count reflects how many
 * *additional* filters the user has applied on top of the GF baseline.
 */
const CORE_DIETARY_FLAG = "glutenFree";

/** URL value → human label, for each checkbox in each category section. */
const RESTAURANT_TYPE_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "bakery", label: "Bakery" },
  { value: "coffee_shop", label: "Coffee Shop" },
  { value: "fast_food", label: "Fast Food" },
  { value: "dessert", label: "Dessert" },
  { value: "fine_dining", label: "Fine Dining" },
];

const DIETARY_OPTIONS = [
  { value: "glutenFree", label: "Gluten Free" },
  { value: "dairyFree", label: "Dairy Free" },
  { value: "eggFree", label: "Egg Free" },
  { value: "nutFree", label: "Nut Free" },
  { value: "peanutFree", label: "Peanut Free" },
  { value: "treeNutFree", label: "Tree Nut Free" },
  { value: "soyFree", label: "Soy Free" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "shellfishFree", label: "Shellfish Free" },
  { value: "sesameFree", label: "Sesame Free" },
];

const FEATURE_OPTIONS = [
  { value: "dedicatedGfKitchen", label: "Dedicated GF Kitchen" },
  { value: "separateFryer", label: "Separate Fryer" },
  { value: "gfMenu", label: "GF Menu" },
  { value: "gfDesserts", label: "GF Desserts" },
  { value: "certifiedGlutenFree", label: "Certified Gluten Free" },
  { value: "staffTrainedForCeliac", label: "Staff Trained for Celiac" },
  {
    value: "crossContaminationPrecautions",
    label: "Cross-Contamination Precautions",
  },
];

/**
 * Read the filter state from URL search params.
 *
 * Special handling for `dietary`: if the key isn't in the URL at all, default
 * to `[glutenFree]`. If the key IS in the URL (even with an empty value), we
 * respect the user's explicit selection — that lets them turn GF off.
 */
function readFilters(searchParams) {
  const filters = { text: {}, categories: {} };

  for (const key of TEXT_KEYS) {
    const v = searchParams.get(key);
    if (v) filters.text[key] = v;
  }

  for (const key of CATEGORY_KEYS) {
    if (searchParams.has(key)) {
      const v = searchParams.get(key) || "";
      filters.categories[key] = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      filters.categories[key] =
        key === "dietary" ? [CORE_DIETARY_FLAG] : [];
    }
  }

  return filters;
}

/** Convert filter state into the params object the API client expects. */
function apiParamsFrom(filters) {
  const out = { ...filters.text };
  for (const key of CATEGORY_KEYS) {
    if (filters.categories[key].length > 0) {
      out[key] = filters.categories[key]; // api.js joins arrays with ","
    }
  }
  return out;
}

/**
 * Count of active filters, excluding the always-on Gluten Free baseline.
 * Text filters count as 1 each; each checked box counts as 1.
 */
function activeFilterCount(filters) {
  let n = 0;
  for (const key of TEXT_KEYS) {
    if (filters.text[key]) n += 1;
  }
  for (const key of CATEGORY_KEYS) {
    for (const v of filters.categories[key]) {
      if (!(key === "dietary" && v === CORE_DIETARY_FLAG)) n += 1;
    }
  }
  return n;
}

// ────────────────────────────────────────────────────────────────────────────
// Text search bar
// ────────────────────────────────────────────────────────────────────────────

function SearchBar({ initialValues, onSubmit }) {
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
        {[
          { key: "name", label: "Name", placeholder: "e.g. Bakehouse" },
          { key: "city", label: "City", placeholder: "e.g. Austin" },
          { key: "state", label: "State", placeholder: "e.g. TX" },
          { key: "zip", label: "Zip", placeholder: "e.g. 78704" },
        ].map(({ key, label, placeholder }) => (
          <label
            key={key}
            className="flex flex-col gap-1 text-sm font-medium text-stone-700"
          >
            {label}
            <input
              type="text"
              value={values[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Clear text
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

// ────────────────────────────────────────────────────────────────────────────
// Filter panel (checkbox groups)
// ────────────────────────────────────────────────────────────────────────────

function FilterSection({ title, options, selected, onToggle, coreValue }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">
        {title}
      </h3>
      <ul className="space-y-2">
        {options.map(({ value, label }) => {
          const isCore = value === coreValue;
          const isChecked = selected.includes(value);
          return (
            <li key={value}>
              <label
                className={
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors " +
                  (isCore
                    ? "border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
                    : "text-stone-700 hover:bg-orange-50")
                }
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => onToggle(value, e.target.checked)}
                  className={
                    "h-4 w-4 rounded border-stone-300 focus:ring-2 focus:ring-offset-0 " +
                    (isCore
                      ? "text-emerald-600 focus:ring-emerald-300"
                      : "text-orange-600 focus:ring-orange-300")
                  }
                />
                <span className="flex-1">{label}</span>
                {isCore && (
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                    Core
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterPanel({ filters, onToggle, onClearAll }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Filters</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-orange-700 underline-offset-2 hover:underline"
        >
          Clear all
        </button>
      </div>

      <FilterSection
        title="Dietary"
        options={DIETARY_OPTIONS}
        selected={filters.categories.dietary}
        onToggle={(v, c) => onToggle("dietary", v, c)}
        coreValue={CORE_DIETARY_FLAG}
      />

      <FilterSection
        title="Restaurant Features"
        options={FEATURE_OPTIONS}
        selected={filters.categories.features}
        onToggle={(v, c) => onToggle("features", v, c)}
      />

      <FilterSection
        title="Restaurant Type"
        options={RESTAURANT_TYPE_OPTIONS}
        selected={filters.categories.restaurantType}
        onToggle={(v, c) => onToggle("restaurantType", v, c)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Results panel
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches restaurants for one specific set of params. Remounted (via key)
 * whenever the URL changes, so it can initialize its state as "loading"
 * without needing to setState synchronously in an effect body.
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
  if (state.data.length === 0) return <EmptyState />;

  return (
    <>
      <p className="mb-4 text-sm text-stone-500">
        {state.data.length} result{state.data.length === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {state.data.map((restaurant) => (
          <RestaurantCard key={restaurant._id} restaurant={restaurant} />
        ))}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Page shell
// ────────────────────────────────────────────────────────────────────────────

function RestaurantsListing() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchKey = searchParams.toString();
  const filters = readFilters(searchParams);
  const activeCount = activeFilterCount(filters);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer with Escape for keyboard users.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  /**
   * Build a new URLSearchParams from the current one, then push it.
   * `scroll: false` keeps the viewport where the user was — otherwise
   * every filter toggle would snap the page back to the top.
   */
  const pushParams = (updater) => {
    const next = new URLSearchParams(searchParams);
    updater(next);
    const qs = next.toString();
    router.push(qs ? `/restaurants?${qs}` : "/restaurants", { scroll: false });
  };

  const handleToggle = (category, value, checked) => {
    pushParams((next) => {
      const current = filters.categories[category];
      const updated = checked
        ? [...current, value]
        : current.filter((v) => v !== value);
      // Empty string (not delete) so an explicitly-empty dietary is preserved
      // and not re-defaulted to `[glutenFree]` by readFilters().
      if (updated.length === 0) {
        next.set(category, "");
      } else {
        next.set(category, updated.join(","));
      }
    });
  };

  const handleClearAll = () => {
    // Clear everything, then re-check the core dietary flag.
    router.push(`/restaurants?dietary=${CORE_DIETARY_FLAG}`, { scroll: false });
    setDrawerOpen(false);
  };

  const handleTextSubmit = (values) => {
    pushParams((next) => {
      for (const key of TEXT_KEYS) {
        const trimmed = (values[key] || "").trim();
        if (trimmed) next.set(key, trimmed);
        else next.delete(key);
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Restaurants
        </h1>
        <p className="mt-2 text-stone-600">
          Search celiac-safe and allergen-friendly restaurants.
        </p>
      </div>

      <SearchBar
        key={`form-${searchKey}`}
        initialValues={{
          name: filters.text.name || "",
          city: filters.text.city || "",
          state: filters.text.state || "",
          zip: filters.text.zip || "",
        }}
        onSubmit={handleTextSubmit}
      />

      {/* Filter count + mobile trigger */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">{activeCount}</span>{" "}
          filter{activeCount === 1 ? "" : "s"} active
          <span className="ml-2 hidden text-stone-400 sm:inline">
            (Gluten Free is always on unless you turn it off)
          </span>
        </p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm hover:bg-orange-50 lg:hidden"
        >
          <span aria-hidden="true">⚙️</span>
          Filters
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-600 px-1.5 text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <FilterPanel
              filters={filters}
              onToggle={handleToggle}
              onClearAll={handleClearAll}
            />
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <ResultsPanel
            key={`results-${searchKey}`}
            params={apiParamsFrom(filters)}
          />
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative ml-auto flex h-full w-80 max-w-full flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 p-4">
              <h2 className="text-lg font-bold text-stone-900">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FilterPanel
                filters={filters}
                onToggle={handleToggle}
                onClearAll={handleClearAll}
              />
            </div>
            <div className="border-t border-stone-100 p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Fallback / status components
// ────────────────────────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
      <p className="text-lg font-semibold text-stone-800">
        No restaurants match your filters
      </p>
      <p className="mt-2 text-sm text-stone-600">
        Try loosening a filter or clearing text search.
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
