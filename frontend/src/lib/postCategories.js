/**
 * Post category slugs → human labels + short blurbs, mirroring
 * POST_CATEGORIES on the backend model. Order here is the display order
 * shown in the sidebar and the create-post dropdown.
 */
export const POST_CATEGORIES = [
  {
    slug: "newly_diagnosed",
    label: "Newly Diagnosed",
    blurb: "New-to-celiac / GF questions and onboarding",
    emoji: "🌱",
  },
  {
    slug: "restaurant_recommendations",
    label: "Restaurant Recommendations",
    blurb: '"Where do you eat in <city>?"',
    emoji: "🍽️",
  },
  {
    slug: "travel_tips",
    label: "Travel Tips",
    blurb: "Flights, road trips, hotels, snacks",
    emoji: "✈️",
  },
  {
    slug: "recipes",
    label: "Recipes",
    blurb: "Home cooking + substitutions",
    emoji: "🥘",
  },
  {
    slug: "grocery_finds",
    label: "Grocery Finds",
    blurb: "New products, brand comparisons",
    emoji: "🛒",
  },
  {
    slug: "dining_questions",
    label: "Dining Questions",
    blurb: "How to order out safely",
    emoji: "❓",
  },
  {
    slug: "cross_contamination_advice",
    label: "Cross-Contamination Advice",
    blurb: "Kitchens, shared equipment, protocols",
    emoji: "⚠️",
  },
  {
    slug: "product_recommendations",
    label: "Product Recommendations",
    blurb: "Flour, pasta, bread, snacks",
    emoji: "🏷️",
  },
  {
    slug: "general_discussion",
    label: "General Discussion",
    blurb: "Everything else",
    emoji: "💬",
  },
];

const BY_SLUG = new Map(POST_CATEGORIES.map((c) => [c.slug, c]));

/** Look up the display object for a slug. Returns null if unknown. */
export function categoryFor(slug) {
  return BY_SLUG.get(slug) || null;
}

/** Human label for a category slug; falls back to the slug if unrecognized. */
export function categoryLabel(slug) {
  return BY_SLUG.get(slug)?.label || slug;
}
