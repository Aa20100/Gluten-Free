"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ModeratorOnly from "@/components/ModeratorOnly";
import RestaurantForm from "@/components/RestaurantForm";
import {
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
} from "@/lib/api";

export default function EditRestaurantPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { getToken } = useAuth();

  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    getRestaurantById(id)
      .then((data) => !cancelled && setState({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setState({ status: "error", data: null, error }));
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = async (payload) => {
    await updateRestaurant(id, payload, getToken);
    router.push(`/restaurants/${id}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href={`/restaurants/${id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <span aria-hidden="true">←</span>
            Back to restaurant
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Edit restaurant
          </h1>

          <ModeratorOnly>
            {state.status === "loading" && (
              <p className="mt-8 text-stone-500">Loading…</p>
            )}
            {state.status === "error" && (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
                <p className="font-semibold text-red-800">
                  Couldn&apos;t load this restaurant.
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {state.error?.message || "Unknown error"}
                </p>
              </div>
            )}
            {state.status === "success" && state.data && (
              <>
                <div className="mt-8">
                  <RestaurantForm
                    initialValues={state.data}
                    onSubmit={handleSave}
                    submitLabel="Save changes"
                    submittingLabel="Saving…"
                    cancelHref={`/restaurants/${id}`}
                  />
                </div>
                <DangerZone id={id} getToken={getToken} />
              </>
            )}
          </ModeratorOnly>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DangerZone({ id, getToken }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (
      !window.confirm("This can't be undone. Delete this restaurant?")
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteRestaurant(id, getToken);
      router.push("/restaurants");
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm sm:p-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">
        Danger zone
      </h2>
      <p className="mt-2 text-sm text-stone-700">
        Deleting a restaurant permanently removes it and its reviews.
      </p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-white p-2 text-sm text-red-700">
          {error.message || "Delete failed."}
        </p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete restaurant"}
      </button>
    </section>
  );
}
