import Link from "next/link";

// href === null → not-yet-functional placeholder; renders as plain text.
const navLinks = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "Forum", href: null },
];

export default function Header() {
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
          <span className="cursor-default rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700">
            Log in
          </span>
        </nav>
      </div>
    </header>
  );
}
