"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Client-side image picker. Holds selected File objects locally with
 * blob-URL previews; the parent uploads them to the backend as multipart
 * on form submit. (The name is historical — uploads now go through our
 * backend to Cloudinary, not browser-direct.)
 *
 * Props:
 *   files    File[] — currently picked (parent-owned)
 *   onChange (files: File[]) => void
 *   maxFiles number — cap on total picks (default 6, matches backend limit)
 */
const DEFAULT_MAX = 6;

export default function CloudinaryUploader({
  files,
  onChange,
  maxFiles = DEFAULT_MAX,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);

  // Blob previews. Derived directly from `files` so there's no
  // setState-in-effect; a separate effect handles the URL.revokeObjectURL
  // cleanup when the memoized array is replaced or the component unmounts.
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );
  useEffect(() => {
    return () => {
      for (const u of previews) URL.revokeObjectURL(u);
    };
  }, [previews]);

  const handlePick = (picked) => {
    setError(null);
    if (picked.length === 0) return;

    const room = maxFiles - files.length;
    if (room <= 0) {
      setError(`You can attach at most ${maxFiles} images.`);
      return;
    }
    const accepted = picked.slice(0, room);
    if (picked.length > room) {
      setError(`Only the first ${room} of ${picked.length} images were added.`);
    }

    onChange([...files, ...accepted]);
  };

  const removeAt = (idx) => {
    const next = files.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          handlePick(Array.from(e.target.files || []));
          // Allow re-picking the same file after removal.
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-700"
      />

      {error && <p className="text-sm text-amber-700">{error}</p>}

      {previews.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((url, i) => (
            <li key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={files[i]?.name ? `${files[i].name} preview` : `Preview ${i + 1}`}
                className="h-24 w-full rounded-lg border border-stone-200 object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-stone-500">
        Uploads happen when you submit the post. Max {maxFiles} images.
      </p>
    </div>
  );
}
