import Link from "next/link";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RestaurantNotFound() {
  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-md rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
          <p className="text-5xl" aria-hidden="true">
            🍽️
          </p>
          <h1 className="mt-4 text-2xl font-bold text-stone-900">
            Restaurant not found
          </h1>
          <p className="mt-2 text-stone-600">
            We couldn&apos;t find that restaurant. It may have been removed, or the
            link may be incorrect.
          </p>
          <Link
            href="/restaurants"
            className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            Browse restaurants
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
