"use client";

/**
 * Star rating — read-only when `onChange` isn't provided; interactive
 * (radiogroup) when it is. Sizes: "sm" | "md" | "lg".
 */
export default function StarRating({
  value = 0,
  onChange,
  size = "md",
  ariaLabel = "Rating",
}) {
  const interactive = typeof onChange === "function";
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-3xl" };
  const sizeClass = sizes[size] || sizes.md;

  return (
    <div
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? ariaLabel : `${value} out of 5 stars`}
      className={`inline-flex items-center gap-1 ${sizeClass}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const cls = filled ? "text-amber-500" : "text-stone-300";
        if (interactive) {
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === value}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => onChange(n)}
              className={`${cls} transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded`}
            >
              ★
            </button>
          );
        }
        return (
          <span key={n} className={cls} aria-hidden="true">
            ★
          </span>
        );
      })}
    </div>
  );
}
