export default function RestaurantCard({ name, city, tags = [] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 text-4xl">
        🍽️
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-stone-900">{name}</h3>
        <p className="text-sm text-stone-500">{city}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
