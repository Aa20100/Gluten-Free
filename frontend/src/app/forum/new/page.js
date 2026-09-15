"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CloudinaryUploader from "@/components/CloudinaryUploader";
import { createPost } from "@/lib/api";
import { POST_CATEGORIES } from "@/lib/postCategories";

/** Split "one, two, three" → ["one", "two", "three"], deduped + trimmed. */
function parseTags(raw) {
  const seen = new Set();
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

export default function NewPostPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    category !== "" &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createPost(
        {
          title: title.trim(),
          body: body.trim(),
          category,
          tags: parseTags(tagsRaw),
          imageUrls,
        },
        getToken
      );
      router.push(`/forum/${created._id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/forum"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <span aria-hidden="true">←</span>
            Back to forum
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            New post
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <Field label="Title" required>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a clear title"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>

            <Field label="Category" required>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="" disabled>
                  Pick a category…
                </option>
                {POST_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Tags"
              hint="Comma-separated. Helps others find your post."
            >
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="e.g. chicago, pizza, dedicated-fryer"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>

            <Field label="Body" required>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Share the details…"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </Field>

            <Field label="Images" hint="Optional. Uploaded to Cloudinary.">
              <CloudinaryUploader imageUrls={imageUrls} onChange={setImageUrls} />
            </Field>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error.message || "Something went wrong posting."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Link
                href="/forum"
                className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-stone-800">
          {label}
          {required && <span className="ml-1 text-red-600">*</span>}
        </span>
        {hint && <span className="text-xs text-stone-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
