"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPostById, deletePost, getMe } from "@/lib/api";
import { categoryFor } from "@/lib/postCategories";

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PostDetailPage({ params }) {
  const { id } = use(params);

  const router = useRouter();
  const { isLoaded: authLoaded, getToken } = useAuth();
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  const [post, setPost] = useState({ status: "loading", data: null, error: null });
  const [dbUserId, setDbUserId] = useState(null); // our Mongo user._id for the current viewer
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Fetch the post. useState initializes to "loading", and Next remounts
  // the whole page component on route change, so no reset-to-loading needed.
  useEffect(() => {
    let cancelled = false;
    getPostById(id)
      .then((data) => !cancelled && setPost({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setPost({ status: "error", data: null, error }));
    return () => { cancelled = true; };
  }, [id]);

  // When signed in, resolve our DB user id so we can compare against
  // post.author._id and show Edit/Delete only to the author.
  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn) return;
    let cancelled = false;
    getMe(getToken)
      .then((me) => !cancelled && setDbUserId(String(me._id)))
      .catch(() => { /* leave dbUserId null → hides author actions */ });
    return () => { cancelled = true; };
  }, [authLoaded, userLoaded, isSignedIn, getToken]);

  const handleDelete = async () => {
    if (!post.data) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePost(post.data._id, getToken);
      router.push("/forum");
    } catch (err) {
      setDeleteError(err);
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
          <Link
            href="/forum"
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <span aria-hidden="true">←</span>
            Back to forum
          </Link>

          {post.status === "loading" && <DetailSkeleton />}
          {post.status === "error" && (
            <ErrorCard
              error={post.error}
              is404={post.error?.status === 404 || post.error?.status === 400}
            />
          )}
          {post.status === "success" && post.data && (
            <PostDetail
              post={post.data}
              isAuthor={
                dbUserId && String(post.data.author?._id) === dbUserId
              }
              onDelete={handleDelete}
              deleting={deleting}
              deleteError={deleteError}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PostDetail({ post, isAuthor, onDelete, deleting, deleteError }) {
  const cat = categoryFor(post.category);
  const authorName = post.author?.name || "Anonymous";

  return (
    <article className="mt-4 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        {post.isPinned && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
            Pinned
          </span>
        )}
        {cat && (
          <Link
            href={`/forum?category=${post.category}`}
            className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 hover:bg-orange-200"
          >
            {cat.emoji} {cat.label}
          </Link>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
        {post.title}
      </h1>

      <p className="mt-2 text-sm text-stone-500">
        by <span className="font-medium text-stone-700">{authorName}</span> ·{" "}
        {formatDateTime(post.createdAt)}
        {post.updatedAt && post.updatedAt !== post.createdAt && (
          <span> · edited {formatDateTime(post.updatedAt)}</span>
        )}
      </p>

      {(post.tags || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="prose prose-stone mt-6 max-w-none whitespace-pre-line text-stone-800">
        {post.body}
      </div>

      {/* Images */}
      {(post.imageUrls || []).length > 0 && (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {post.imageUrls.map((url, i) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="w-full rounded-xl border border-stone-200 object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {/* Author actions */}
      {isAuthor && (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-orange-100 pt-4">
          <Link
            href={`/forum/${post._id}/edit`}
            className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          {deleteError && (
            <p className="w-full text-sm text-red-700">
              {deleteError.message || "Delete failed."}
            </p>
          )}
        </div>
      )}

      {/* Comments placeholder */}
      <section
        aria-labelledby="comments-heading"
        className="mt-8 rounded-xl border border-dashed border-orange-200 bg-orange-50/60 p-6 text-center"
      >
        <h2 id="comments-heading" className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Comments
        </h2>
        <p className="mt-2 text-stone-600">Comments coming soon.</p>
      </section>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-4 animate-pulse rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
      <div className="mb-3 flex gap-2">
        <div className="h-4 w-20 rounded-full bg-orange-100" />
      </div>
      <div className="h-8 w-3/4 rounded bg-stone-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-stone-100" />
      <div className="mt-6 space-y-2">
        <div className="h-3 w-full rounded bg-stone-100" />
        <div className="h-3 w-full rounded bg-stone-100" />
        <div className="h-3 w-4/5 rounded bg-stone-100" />
      </div>
    </div>
  );
}

function ErrorCard({ error, is404 }) {
  if (is404) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
        <p className="text-5xl" aria-hidden="true">💬</p>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Post not found</h1>
        <p className="mt-2 text-stone-600">
          This post might have been deleted, or the link may be incorrect.
        </p>
        <Link
          href="/forum"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Browse the forum
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
      <p className="font-semibold text-red-800">Couldn&apos;t load this post.</p>
      {error?.message && <p className="mt-2 text-sm text-red-700">{error.message}</p>}
    </div>
  );
}
