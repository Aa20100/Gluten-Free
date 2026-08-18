export default function ForumRow({ title, category, author, date }) {
  return (
    <div className="flex flex-col gap-2 border-b border-orange-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          {category}
        </span>
        <h3 className="font-medium text-stone-900">{title}</h3>
      </div>
      <div className="text-sm text-stone-500">
        {author} · {date}
      </div>
    </div>
  );
}
