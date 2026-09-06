"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Default search radius (km) when jumping to /restaurants from geolocation. */
const DEFAULT_RADIUS_KM = 25;

/**
 * "Find Restaurants Near You" button. Requests the browser's geolocation
 * permission and, on success, navigates to /restaurants?lat=&lng=&radius=25.
 *
 * On denial / timeout / browsers without a Geolocation API, shows a small
 * inline fallback with a link to browse by city instead.
 */
export default function NearbyButton() {
  const router = useRouter();
  // 'idle' | 'loading' | 'denied' | 'unsupported'
  const [state, setState] = useState("idle");

  const handleClick = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }

    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Preserve enough precision for a city-scale search without leaking
        // meter-level user location into URL history.
        const lat = latitude.toFixed(4);
        const lng = longitude.toFixed(4);
        router.push(
          `/restaurants?lat=${lat}&lng=${lng}&radius=${DEFAULT_RADIUS_KM}`
        );
      },
      () => {
        // Any failure — permission denied, timeout, position unavailable —
        // gets the same fallback UI. We don't try to explain each variant
        // because the user's remedy is the same either way.
        setState("denied");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const isLoading = state === "loading";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="mt-1 inline-flex items-center gap-2 rounded-full border border-orange-300 bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden="true">📍</span>
        {isLoading ? "Getting your location…" : "Find Restaurants Near You"}
      </button>

      {(state === "denied" || state === "unsupported") && (
        <div className="max-w-md rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-stone-700">
          <p>
            {state === "unsupported"
              ? "Your browser doesn't support location sharing, so we can't find nearby spots automatically."
              : "We need your location to find nearby restaurants. You can enable it in your browser's site settings, or search by city instead."}
          </p>
          <Link
            href="/restaurants"
            className="mt-2 inline-block font-semibold text-orange-700 hover:text-orange-800"
          >
            Search by city →
          </Link>
        </div>
      )}
    </div>
  );
}
