export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-emerald-100 bg-white text-stone-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <span className="text-base font-semibold text-emerald-700">
          safely<span className="font-bold text-emerald-800">GF</span>
        </span>
        <p className="text-sm text-stone-500">
          © {year} safelyGF
        </p>
      </div>
    </footer>
  );
}
