"use client";

import { useState } from "react";

import CloudinaryUploader from "@/components/CloudinaryUploader";
import {
  RESTAURANT_TYPE_OPTIONS,
  DIETARY_OPTIONS,
  FEATURE_OPTIONS,
} from "@/lib/restaurantOptions";

/**
 * Reusable form for suggest / create / edit flows. The parent picks
 * which API endpoint to call by supplying `onSubmit`; the form handles
 * all local state and shapes the payload the same way every time.
 *
 * Payload shape passed to onSubmit:
 *   {
 *     name, description, phone, website,
 *     address:        { street?, city?, state?, zip?, country? }?,
 *     location:       { type: "Point", coordinates: [lng, lat] }?,
 *     cuisine:        string[],
 *     restaurantType: string[],
 *     dietary:        Record<string, boolean>   // only truthy flags
 *     features:       Record<string, boolean>,  // only truthy flags
 *     imageUrls:      string[],                 // URLs to KEEP on save
 *     files:          File[],                   // new uploads
 *   }
 *
 * The backend merges `imageUrls` (kept) + uploads (`files`).
 */
export default function RestaurantForm({
  initialValues = {},
  onSubmit,
  submitLabel = "Save",
  submittingLabel = "Saving…",
  onCancel,
  cancelHref,
}) {
  const [form, setForm] = useState(() => hydrate(initialValues));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
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

  const removeKeptImage = (idx) => {
    const next = form.keptUrls.slice();
    next.splice(idx, 1);
    set("keptUrls")(next);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(buildPayload(form));
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
    // On success, parent decides where to go (usually a router.push that
    // unmounts us) — we deliberately don't clear `submitting` so the
    // button stays disabled while navigation happens.
  };

  const totalImages = form.keptUrls.length + form.files.length;
  const imageSlotsLeft = Math.max(0, 5 - form.keptUrls.length);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <input type="tel" value={form.phone} onChange={setField("phone")} className={inputClass} />
          </Field>
          <Field label="Website">
            <input type="url" value={form.website} onChange={setField("website")} placeholder="https://example.com" className={inputClass} />
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
          <input type="text" value={form.street} onChange={setField("street")} className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City">
            <input type="text" value={form.city} onChange={setField("city")} className={inputClass} />
          </Field>
          <Field label="State">
            <input type="text" value={form.state} onChange={setField("state")} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Zip">
            <input type="text" value={form.zip} onChange={setField("zip")} className={inputClass} />
          </Field>
          <Field label="Country">
            <input type="text" value={form.country} onChange={setField("country")} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section
        title="Location"
        hint="Coordinates power the nearby-search map."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Latitude">
            <input type="number" step="any" value={form.lat} onChange={setField("lat")} placeholder="e.g. 30.2969" className={inputClass} />
          </Field>
          <Field label="Longitude">
            <input type="number" step="any" value={form.lng} onChange={setField("lng")} placeholder="e.g. -97.7419" className={inputClass} />
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
            {geoStatus.state === "loading" ? "Getting location…" : "Use my current location"}
          </button>
          {geoStatus.error && <span className="text-sm text-red-700">{geoStatus.error}</span>}
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

      <Section title="Photos" hint={`Up to 5${totalImages > 0 ? ` — ${totalImages} attached` : ""}`}>
        {form.keptUrls.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Existing images
            </p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.keptUrls.map((url, i) => (
                <li key={url} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Kept image ${i + 1}`}
                    className="h-20 w-full rounded-lg border border-stone-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeptImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {imageSlotsLeft > 0 ? (
          <CloudinaryUploader
            files={form.files}
            onChange={set("files")}
            maxFiles={imageSlotsLeft}
          />
        ) : (
          <p className="text-xs text-stone-500">
            Max 5 images. Remove one above to add another.
          </p>
        )}
      </Section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message || "Something went wrong submitting."}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {(onCancel || cancelHref) && (
          onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          ) : (
            <a
              href={cancelHref}
              className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </a>
          )
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Hydrate / build helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * Turn a Restaurant doc from the API (or {}) into the flat form state
 * shape used above. Address and location are flattened; cuisine array
 * becomes a comma-separated string; imageUrls become `keptUrls`.
 */
function hydrate(v) {
  const addr = v.address || {};
  const coords = v.location?.coordinates;
  const lngLat = Array.isArray(coords) && coords.length === 2 ? coords : null;
  return {
    name: v.name || "",
    description: v.description || "",
    street: addr.street || "",
    city: addr.city || "",
    state: addr.state || "",
    zip: addr.zip || "",
    country: addr.country || "USA",
    phone: v.phone || "",
    website: v.website || "",
    cuisine: Array.isArray(v.cuisine) ? v.cuisine.join(", ") : "",
    lat: lngLat ? String(lngLat[1]) : "",
    lng: lngLat ? String(lngLat[0]) : "",
    restaurantType: Array.isArray(v.restaurantType) ? [...v.restaurantType] : [],
    dietary: v.dietary ? { ...v.dietary } : {},
    features: v.features ? { ...v.features } : {},
    keptUrls: Array.isArray(v.imageUrls) ? [...v.imageUrls] : [],
    files: [],
  };
}

function buildPayload(form) {
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
    // `imageUrls` is "URLs to KEEP" — the parent's caller (backend) merges
    // these with newly uploaded files.
    imageUrls: form.keptUrls,
    files: form.files,
  };
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
