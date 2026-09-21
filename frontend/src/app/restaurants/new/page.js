"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ModeratorOnly from "@/components/ModeratorOnly";
import RestaurantForm from "@/components/RestaurantForm";
import { createRestaurant } from "@/lib/api";

export default function NewRestaurantPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const handleSubmit = async (payload) => {
    const created = await createRestaurant(payload, getToken);
    // Send the mod straight to the restaurant they just created.
    router.push(`/restaurants/${created._id}`);
  };

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
            Add restaurant
          </h1>
          <p className="mt-2 text-stone-600">
            Moderator create — the restaurant will be published immediately
            (bypasses the pending queue).
          </p>

          <ModeratorOnly>
            <div className="mt-8">
              <RestaurantForm
                onSubmit={handleSubmit}
                submitLabel="Create restaurant"
                submittingLabel="Creating…"
                cancelHref="/restaurants"
              />
            </div>
          </ModeratorOnly>
        </div>
      </main>
      <Footer />
    </div>
  );
}
