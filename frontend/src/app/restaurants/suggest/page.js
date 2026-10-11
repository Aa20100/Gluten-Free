"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestaurantForm from "@/components/RestaurantForm";
import { suggestRestaurant } from "@/lib/api";

export default function SuggestRestaurantPage() {
  const { getToken } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (payload) => {
    await suggestRestaurant(payload, getToken);
    setSubmitted(true);
  };

  if (submitted) {
    return <ThanksScreen onSuggestAnother={() => setSubmitted(false)} />;
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
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

          <div className="mt-8">
            <RestaurantForm
              onSubmit={handleSubmit}
              submitLabel="Suggest restaurant"
              submittingLabel="Submitting…"
              cancelHref="/restaurants"
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ThanksScreen({ onSuggestAnother }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Thanks!</h1>
          <p className="mt-2 text-stone-700">
            A moderator will review your suggestion and, if it looks good,
            publish it to the map.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to home
            </Link>
            <button
              type="button"
              onClick={onSuggestAnother}
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
