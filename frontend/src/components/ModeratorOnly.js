"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";

import { getMe } from "@/lib/api";

/**
 * Client-side moderator gate. Middleware already guarantees the user is
 * signed in before this renders. We then check `getMe().role` and
 * either render the children (moderators) or a friendly "no permission"
 * panel (regular signed-in users). Both the middleware and the backend
 * API endpoints enforce the real check — this is just for UX.
 *
 * States exposed as React tree:
 *   - loading: "Checking your access…"
 *   - non-mod: an inline "You don't have permission" panel
 *   - mod:     children (via render-prop or React children)
 */
export default function ModeratorOnly({ children }) {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();

  const [state, setState] = useState({ status: "loading", isMod: false, error: null });

  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn) return;
    let cancelled = false;
    getMe(getToken)
      .then((me) => {
        if (cancelled) return;
        setState({
          status: "success",
          isMod: me?.role === "moderator",
          error: null,
        });
      })
      .catch((error) => !cancelled && setState({ status: "error", isMod: false, error }));
    return () => { cancelled = true; };
  }, [authLoaded, userLoaded, isSignedIn, getToken]);

  if (state.status === "loading") {
    return <p className="mt-8 text-stone-500">Checking your access…</p>;
  }

  if (state.status === "success" && !state.isMod) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center">
        <p className="text-5xl" aria-hidden="true">🛡</p>
        <h2 className="mt-4 text-xl font-bold text-stone-900">
          You don&apos;t have permission to view this page
        </h2>
        <p className="mt-2 text-stone-600">
          This area is for moderators only.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="mt-8 text-sm text-red-700">
        Couldn&apos;t verify your access: {state.error?.message}
      </p>
    );
  }

  return children;
}
