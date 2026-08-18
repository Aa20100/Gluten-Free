export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-orange-900/40 bg-stone-900 text-stone-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <span className="flex items-center gap-2 text-lg font-bold text-amber-50">
          <span aria-hidden="true">🌾</span>
          SafeBite
        </span>
        <p className="text-sm text-stone-400">
          © {year} SafeBite. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
