import Link from "next/link";

/**
 * Feature-flag → human label map. Used to render a short list of prominent
 * safety features as tag pills on the card.
 */
const FEATURE_LABELS = {
  gfMenu: "GF Menu",
  dedicatedGfKitchen: "Dedicated GF Kitchen",
  separateFryer: "Dedicated Fryer",
  gfDesserts: "GF Desserts",
  certifiedGlutenFree: "Certified GF",
  staffTrainedForCeliac: "Celiac-Trained Staff",
  crossContaminationPrecautions: "Cross-Contact Precautions",
};

function buildFeatureTags(features, max = 3) {
  if (!features) return [];
  return Object.entries(FEATURE_LABELS)
    .filter(([key]) => features[key])
    .slice(0, max)
    .map(([, label]) => label);
}

function formatLocation(address) {
  if (!address) return "";
  const parts = [address.city, address.state].filter(Boolean);
  return parts.join(", ");
}

export default function RestaurantCard({ restaurant }) {
  if (!restaurant) return null;

  const { _id, name, address, imageUrls, features, source } = restaurant;
  const location = formatLocation(address);
  const tags = buildFeatureTags(features);
  // Cards only show a single hero — the first image from the gallery. The
  // rest render on the detail page.
  const heroImage = Array.isArray(imageUrls) ? imageUrls[0] : null;
  const isOsm = source === "osm";

  return (
    <Link
      href={`/restaurants/${_id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      {heroImage ? (
        // Plain <img> keeps things simple and avoids configuring
        // next/image remotePatterns for arbitrary hosts. Swap for
        // <Image /> later.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImage}
          alt={name}
          className="h-40 w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-100 text-4xl">
          🍽️
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-stone-900">{name}</h3>
        {location && <p className="text-sm text-stone-500">{location}</p>}
        {isOsm && (
          <p className="text-xs italic text-stone-500">
            Community info — details may be incomplete
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
