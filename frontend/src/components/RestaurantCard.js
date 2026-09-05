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

  const { _id, name, address, imageUrl, features } = restaurant;
  const location = formatLocation(address);
  const tags = buildFeatureTags(features);

  return (
    <Link
      href={`/restaurants/${_id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      {imageUrl ? (
        // Placeholder images from the seed live on example.com; using a plain
        // <img> here keeps things simple and avoids next/image remotePatterns
        // config for arbitrary hosts. Swap for <Image /> later.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="h-40 w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 text-4xl">
          🍽️
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-stone-900">{name}</h3>
        {location && <p className="text-sm text-stone-500">{location}</p>}
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
