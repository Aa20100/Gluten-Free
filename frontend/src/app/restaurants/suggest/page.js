"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CloudinaryUploader from "@/components/CloudinaryUploader";
import { suggestRestaurant } from "@/lib/api";
import {
  RESTAURANT_TYPE_OPTIONS,
  DIETARY_OPTIONS,
  FEATURE_OPTIONS,
} from "@/lib/restaurantOptions";

/** Blank starting shape for a new suggestion. */
const EMPTY_FORM = {
  name: "",
  description: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "USA",
  phone: "",
  website: "",
  cuisine: "",
  lat: "",
  lng: "",
  restaurantType: [],
  dietary: {},
  features: {},
  files: [],
};

export default function SuggestRestaurantPage() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ state: "idle", error: null });

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setField = (key) => (e) => set(key)(e.target.value);
  const toggleInArray = (key, value, checked) =>
    setForm((f) => ({
      ...f,
      [key]: checked
        ? [...(f[key] || []), value]
        : (f[key] || []).filter((v) => v !== value),
    }));
  const toggleInMap = (key, flag, checked) =>
    setForm((f) => ({ ...f, [key]: { ...(f[key] || {}), [flag]: checked } }));

  const canSubmit = form.name.trim().length > 0 && !submitting;

  const handleGeolocate = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus({ state: "error", error: "Your browser doesn't support geolocation" });
      return;
    }
    setGeoStatus({ state: "loading", error: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoStatus({ state: "idle", error: null });
      },
      (err) => {
        setGeoStatus({
          state: "error",
          error: err?.message || "Couldn't get your location",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const buildPayload = () => {
    // Trim and shape the form into what the backend expects.
    const address = pickTruthy({
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      country: form.country.trim(),
    });

    const latN = Number(form.lat);
    const lngN = Number(form.lng);
    let location;
    if (Number.isFinite(latN) && Number.isFinite(lngN) && form.lat !== "" && form.lng !== "") {
      // GeoJSON: [longitude, latitude]
      location = { type: "Point", coordinates: [lngN, latN] };
    }

    const cuisine = form.cuisine
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Only include flags the user actually turned ON — no reason to send
    // `{ eggFree: false }` etc. to the backend.
    const dietary = Object.fromEntries(
      Object.entries(form.dietary).filter(([, v]) => v === true)
    );
    const features = Object.fromEntries(
      Object.entries(form.features).filter(([, v]) => v === true)
    );

    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      address: Object.keys(address).length > 0 ? address : undefined,
      location,
      cuisine,
      restaurantType: form.restaurantType,
      dietary,
      features,
      files: form.files,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await suggestRestaurant(buildPayload(), getToken);
      setSubmitted(true);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col bg-amber-50">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-5xl" aria-hidden="true">🌾</p>
            <h1 className="mt-4 text-2xl font-bold text-stone-900">Thanks!</h1>
            <p className="mt-2 text-stone-700">
              A moderator will review your suggestion and, if it looks good,
              publish it to the map.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Back to home
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Suggest another
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <span aria-hidden="true">←</span>
            Back to restaurants
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Suggest a restaurant
          </h1>
          <p className="mt-2 text-stone-600">
            Know a gluten-free-friendly spot we&apos;re missing? Add it here — a
            moderator will review before it appears in search.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Section title="Basics">
              <Field label="Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={setField("name")}
                  placeholder="e.g. Wildwood Bakehouse"
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={setField("description")}
                  rows={3}
                  placeholder="What makes this place GF-friendly?"
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={setField("phone")}
                    placeholder="(512) 555-0148"
                    className={inputClass}
                  />
                </Field>
                <Field label="Website">
                  <input
                    type="url"
                    value={form.website}
                    onChange={setField("website")}
                    placeholder="https://example.com"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Cuisine" hint="Comma-separated">
                <input
                  type="text"
                  value={form.cuisine}
                  onChange={setField("cuisine")}
                  placeholder="Italian, Pizza"
                  className={inputClass}
                />
              </Field>
            </Section>

            <Section title="Address">
              <Field label="Street">
                <input
                  type="text"
                  value={form.street}
                  onChange={setField("street")}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    type="text"
                    value={form.city}
                    onChange={setField("city")}
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    value={form.state}
                    onChange={setField("state")}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Zip">
                  <input
                    type="text"
                    value={form.zip}
                    onChange={setField("zip")}
                    className={inputClass}
                  />
                </Field>
                <Field label="Country">
                  <input
                    type="text"
                    value={form.country}
                    onChange={setField("country")}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>

            <Section
              title="Location"
              hint="Coordinates help us show it on the nearby-search map."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Latitude">
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={setField("lat")}
                    placeholder="e.g. 30.2969"
                    className={inputClass}
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={setField("lng")}
                    placeholder="e.g. -97.7419"
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={geoStatus.state === "loading"}
                  className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60"
                >
                  <span aria-hidden="true">📍</span>
                  {geoStatus.state === "loading"
                    ? "Getting location…"
                    : "Use my current location"}
                </button>
                {geoStatus.error && (
                  <span className="text-sm text-red-700">{geoStatus.error}</span>
                )}
              </div>
            </Section>

            <Section title="Restaurant type">
              <CheckboxGrid
                options={RESTAURANT_TYPE_OPTIONS}
                selected={form.restaurantType}
                onToggle={(v, c) => toggleInArray("restaurantType", v, c)}
              />
            </Section>

            <Section title="Dietary options">
              <CheckboxGrid
                options={DIETARY_OPTIONS}
                selected={Object.keys(form.dietary).filter((k) => form.dietary[k])}
                onToggle={(v, c) => toggleInMap("dietary", v, c)}
              />
            </Section>

            <Section title="Celiac-safety features">
              <CheckboxGrid
                options={FEATURE_OPTIONS}
                selected={Object.keys(form.features).filter((k) => form.features[k])}
                onToggle={(v, c) => toggleInMap("features", v, c)}
              />
            </Section>

            <Section title="Photos" hint="Optional. Uploaded when you submit.">
              <CloudinaryUploader
                files={form.files}
                onChange={set("files")}
                maxFiles={5}
              />
            </Section>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error.message || "Something went wrong submitting."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Link
                href="/restaurants"
                className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Local primitives ────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200";

function pickTruthy(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
}

function Section({ title, hint, children }) {
  return (
    <section className="space-y-3 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-stone-800">
          {label}
          {required && <span className="ml-1 text-red-600">*</span>}
        </span>
        {hint && <span className="text-xs text-stone-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function CheckboxGrid({ options, selected, onToggle }) {
  const selectedSet = new Set(selected);
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map(({ value, label }) => (
        <li key={value}>
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-stone-700 hover:bg-orange-50">
            <input
              type="checkbox"
              checked={selectedSet.has(value)}
              onChange={(e) => onToggle(value, e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-2 focus:ring-orange-300"
            />
            <span>{label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
