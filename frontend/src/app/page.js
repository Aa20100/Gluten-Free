import Link from "next/link";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";
import NearbyButton from "@/components/NearbyButton";
import RecentForumPosts from "@/components/RecentForumPosts";

// Placeholder data shaped like the backend Restaurant model so RestaurantCard
// can render it directly. Swap for a real fetch of featured restaurants later.
const featuredRestaurants = [
  {
    _id: "featured-1",
    name: "Harvest & Hearth",
    address: { city: "Austin", state: "TX" },
    features: { gfMenu: true, separateFryer: true },
  },
  {
    _id: "featured-2",
    name: "The Tender Fork",
    address: { city: "Portland", state: "OR" },
    features: { gfMenu: true, staffTrainedForCeliac: true },
  },
  {
    _id: "featured-3",
    name: "Sunny Side Café",
    address: { city: "Denver", state: "CO" },
    features: { separateFryer: true, dedicatedGfKitchen: true },
  },
];

// Each pill maps a display label to the query params the /restaurants page
// understands. The backend only supports `name` filtering right now, so
// everything routes through that; once a `type` filter is added, we can
// change specific pills' params without touching UI code.
const popularSearches = [
  { label: "Pizza", params: { name: "pizza" } },
  { label: "Bakery", params: { name: "bakery" } },
  { label: "Breakfast", params: { name: "breakfast" } },
  { label: "Vegan + GF", params: { name: "vegan" } },
  { label: "Brunch", params: { name: "brunch" } },
  { label: "Fast Casual", params: { name: "casual" } },
];

/** Build a /restaurants URL from a params object, skipping empty values. */
function restaurantsHref(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim() !== "") {
      qs.set(key, String(value).trim());
    }
  }
  const s = qs.toString();
  return s ? `/restaurants?${s}` : "/restaurants";
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-emerald-100 bg-white px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-5">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Finding gluten-free food the easy way.
            </h1>
            <p className="max-w-xl text-lg text-stone-600">
              A gluten-free restaurant guide. We note which kitchens have
              dedicated fryers, trained staff, and a real GF menu, so you
              don&apos;t have to.
            </p>

            {/* Plain GET form → the browser navigates to
                /restaurants?name=<input value> on submit. No JS needed. */}
            <form
              action="/restaurants"
              method="GET"
              className="mt-2 flex w-full max-w-xl flex-col gap-3 rounded-2xl bg-white p-2 shadow-md sm:flex-row"
            >
              <input
                type="text"
                name="name"
                placeholder="Search by restaurant, cuisine, or city..."
                className="flex-1 rounded-xl border-0 bg-transparent px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Search
              </button>
            </form>

            <NearbyButton />
          </div>
        </section>

        {/* Featured restaurants */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            Featured Restaurants
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        </section>

        {/* Popular searches */}
        <section className="bg-emerald-50 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              Popular Searches
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {popularSearches.map(({ label, params }) => (
                <Link
                  key={label}
                  href={restaurantsHref(params)}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100 hover:text-emerald-800"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent forum discussions */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              Recent Forum Discussions
            </h2>
            <Link
              href="/forum"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              See all →
            </Link>
          </div>
          <div className="mt-6">
            <RecentForumPosts />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
