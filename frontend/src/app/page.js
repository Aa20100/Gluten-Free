import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantCard from "@/components/RestaurantCard";
import ForumRow from "@/components/ForumRow";

const featuredRestaurants = [
  {
    name: "Harvest & Hearth",
    city: "Austin, TX",
    tags: ["GF Menu", "Dedicated Fryer"],
  },
  {
    name: "The Tender Fork",
    city: "Portland, OR",
    tags: ["Celiac Safe", "GF Menu"],
  },
  {
    name: "Sunny Side Café",
    city: "Denver, CO",
    tags: ["Dedicated Fryer", "Nut-Free Options"],
  },
];

const popularSearches = [
  "Pizza",
  "Bakery",
  "Breakfast",
  "Vegan + GF",
  "Brunch",
  "Fast Casual",
];

const forumDiscussions = [
  {
    title: "Best GF pizza crust in Chicago?",
    category: "Recommendations",
    author: "@celiac_sarah",
    date: "2 days ago",
  },
  {
    title: "Cross-contamination questions at buffets",
    category: "Safety Tips",
    author: "@glutenfreejoe",
    date: "4 days ago",
  },
  {
    title: "Dedicated GF bakery opening downtown!",
    category: "News",
    author: "@bakerybeth",
    date: "1 week ago",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-orange-100 via-amber-50 to-amber-50 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
              Find restaurants you can actually eat at.
            </h1>
            <p className="max-w-xl text-lg text-stone-600">
              Celiac-safe, allergen-friendly dining — vetted by people who
              actually ask &quot;is the fryer shared?&quot;
            </p>

            <div className="mt-2 flex w-full max-w-xl flex-col gap-3 rounded-2xl bg-white p-2 shadow-md sm:flex-row">
              <input
                type="text"
                placeholder="Search by restaurant, cuisine, or city..."
                className="flex-1 rounded-xl border-0 bg-transparent px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                type="button"
                className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Search
              </button>
            </div>

            <button
              type="button"
              className="mt-1 inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50"
            >
              <span aria-hidden="true">📍</span>
              Find Restaurants Near You
            </button>
          </div>
        </section>

        {/* Featured restaurants */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            Featured Restaurants
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.name} {...restaurant} />
            ))}
          </div>
        </section>

        {/* Popular searches */}
        <section className="bg-orange-50 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              Popular Searches
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-orange-400 hover:bg-orange-100 hover:text-orange-800"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Recent forum discussions */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            Recent Forum Discussions
          </h2>
          <div className="mt-8 rounded-2xl border border-orange-100 bg-white px-5 shadow-sm sm:px-6">
            {forumDiscussions.map((discussion) => (
              <ForumRow key={discussion.title} {...discussion} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
