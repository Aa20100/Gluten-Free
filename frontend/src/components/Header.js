"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show, SignInButton, useAuth, UserButton, useUser } from "@clerk/nextjs";

import { getMe } from "@/lib/api";

// href === null → not-yet-functional placeholder; renders as plain text.
const navLinks = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "Forum", href: "/forum" },
];

export default function Header() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [isModerator, setIsModerator] = useState(false);

  // Fetch the DB user once per sign-in so we can conditionally show the
  // Reports link. Non-mod users just don't see it; the API also enforces
  // the check.
  useEffect(() => {
    // Skip when not signed in. Anything that pushes us into this state
    // (e.g. sign-out) unmounts + remounts, so we don't need a reset here.
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    getMe(getToken)
      .then((me) => !cancelled && setIsModerator(me?.role === "moderator"))
      .catch(() => { /* leave mod false */ });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-amber-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-orange-700"
        >
          <span aria-hidden="true" className="text-2xl">
            🌾
          </span>
          SafeBite
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          {navLinks.map(({ label, href }) =>
            href ? (
              <Link
                key={label}
                href={href}
                className="text-sm font-medium text-stone-700 transition-colors hover:text-orange-700"
              >
                {label}
              </Link>
            ) : (
              <span
                key={label}
                className="cursor-default text-sm font-medium text-stone-700 transition-colors hover:text-orange-700"
              >
                {label}
              </span>
            )
          )}

          {/* Gate on isSignedIn too so a stale isModerator=true after
              sign-out doesn't leak the link. */}
          {isSignedIn && isModerator && (
            <Link
              href="/moderation/reports"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-200"
              title="Moderator tools"
            >
              <span aria-hidden="true">🛡</span>
              Reports
            </Link>
          )}

          {/* Auth-aware slots. Clerk's <Show when="..."> renders its children
              only when the auth state matches — so the header swaps between a
              Log-in button and the user avatar without any client-side
              branching of our own. (In Core 3 this replaces the old
              <SignedIn> / <SignedOut> components.) */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="cursor-pointer rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
              >
                Log in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: "h-9 w-9" } }}
            />
          </Show>
        </nav>
      </div>
    </header>
  );
}
