import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRestaurantById } from "@/lib/api";

// Human-friendly labels for every dietary flag on the Restaurant model.
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

// Human-friendly labels for every celiac-safety feature.
const FEATURE_LABELS = {
  dedicatedGfKitchen: "Dedicated GF Kitchen",
  separateFryer: "Dedicated Fryer",
  gfMenu: "Dedicated GF Menu",
  gfDesserts: "GF Desserts",
  certifiedGlutenFree: "Certified Gluten-Free",
  staffTrainedForCeliac: "Staff Trained for Celiac",
  crossContaminationPrecautions: "Cross-Contact Precautions",
};

// Human-friendly labels for restaurantType enum values.
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

export default async function RestaurantDetailPage({ params }) {
  const { id } = await params;

  let restaurant;
  try {
    restaurant = await getRestaurantById(id);
  } catch (err) {
    // Bad ObjectId (400) or missing (404) → show the 404 UI. Any other
    // failure re-throws to be caught by an error boundary or Next's default.
    if (err?.status === 404 || err?.status === 400) {
      notFound();
    }
    throw err;
  }

  const {
    name,
    description,
    address,
    location,
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

  // Build a Google Maps link. Prefer coordinates when available; otherwise
  // fall back to a text query built from the name and address.
  let mapsHref = null;
  if (
    location?.coordinates &&
    location.coordinates.length === 2 &&
    typeof location.coordinates[0] === "number"
  ) {
    const [lng, lat] = location.coordinates;
    mapsHref = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  } else if (address) {
    const q = [name, address.street, address.city, address.state, address.zip]
      .filter(Boolean)
      .join(", ");
    if (q) mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          {/* Back link */}
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <span aria-hidden="true">←</span>
            Back to restaurants
          </Link>

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

              <div className="flex flex-col items-start gap-1 sm:items-end sm:text-right">
                <div className="flex items-center gap-1 text-lg font-bold text-stone-900">
                  <span aria-hidden="true" className="text-amber-500">
                    ★
                  </span>
                  {averageRating.toFixed(1)}
                </div>
                <p className="text-xs text-stone-500">
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {description && (
            <Section title="About">
              <p className="text-stone-700">{description}</p>
            </Section>
          )}

          {/* Two-column detail grid */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Safety features */}
            <Section title="Celiac-Safety Features">
              {featureFlags.length > 0 ? (
                <ul className="space-y-2">
                  {featureFlags.map((label) => (
                    <li
                      key={label}
                      className="flex items-center gap-2 text-stone-800"
                    >
                      <CheckMark />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine>No safety features listed.</EmptyLine>
              )}
            </Section>

            {/* Dietary */}
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

            {/* Contact */}
            <Section title="Contact">
              <dl className="space-y-3 text-sm">
                {phone && (
                  <DlRow term="Phone">
                    <a
                      href={`tel:${phone}`}
                      className="text-orange-700 hover:text-orange-800"
                    >
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
                {!phone && !websiteHref && (
                  <EmptyLine>No contact info on file.</EmptyLine>
                )}
              </dl>
            </Section>

            {/* Address / Map */}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}

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
