"use client";

import { useRef, useState } from "react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const CONFIGURED = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Uploads image files to Cloudinary using an unsigned upload preset —
 * runs entirely in the browser (no backend involvement). Parent owns the
 * URL list; this component only appends via `onChange`.
 *
 * Gracefully disables itself with an inline note when the Cloudinary env
 * vars aren't set, so text-only posts still work while the account is
 * being provisioned.
 */
export default function CloudinaryUploader({ imageUrls, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(0); // count of in-flight uploads
  const [error, setError] = useState(null);

  const handleFiles = async (files) => {
    if (!CONFIGURED || files.length === 0) return;
    setError(null);

    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: "POST", body: form }
        );
        if (!res.ok) {
          let detail = "";
          try { detail = (await res.json())?.error?.message || ""; } catch {}
          throw new Error(
            `Upload failed (${res.status})${detail ? `: ${detail}` : ""}`
          );
        }
        const body = await res.json();
        // Prefer secure_url; fall back to url for older presets.
        const url = body.secure_url || body.url;
        if (!url) throw new Error("Cloudinary response missing URL");
        onChange([...imageUrls, url]);
      } catch (err) {
        setError(err);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const removeAt = (idx) => {
    const next = imageUrls.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  if (!CONFIGURED) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
        Image uploads aren&apos;t configured yet. Set{" "}
        <code className="rounded bg-stone-100 px-1">
          NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        </code>{" "}
        and{" "}
        <code className="rounded bg-stone-100 px-1">
          NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
        </code>{" "}
        in <code className="rounded bg-stone-100 px-1">frontend/.env.local</code>{" "}
        to enable. Text posts still work.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            handleFiles(Array.from(e.target.files || []));
            // Allow re-selecting the same file after removal.
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-700"
        />
        {uploading > 0 && (
          <span className="whitespace-nowrap text-sm text-stone-500">
            Uploading {uploading}…
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700">
          {error.message || "Upload failed."}
        </p>
      )}

      {imageUrls.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imageUrls.map((url, i) => (
            <li key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Upload ${i + 1}`}
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
    </div>
  );
}
