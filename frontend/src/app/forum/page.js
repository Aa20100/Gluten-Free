"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPosts } from "@/lib/api";
import { POST_CATEGORIES, categoryFor } from "@/lib/postCategories";

const PAGE_SIZE = 20;

/** Extract & normalize URL query params → the shape we pass to the API. */
function readParams(searchParams) {
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") === "popular" ? "popular" : "recent";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  return { category, sort, page };
}

function relativeDate(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ────────────────────────────────────────────────────────────────────────
// Page shell
// ────────────────────────────────────────────────────────────────────────

export default function ForumPage() {
  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageSkeleton />}>
          <ForumBody />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function ForumBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { category, sort, page } = readParams(searchParams);
  const searchKey = searchParams.toString();

  const activeCategory = categoryFor(category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Forum
          </h1>
          <p className="mt-2 text-stone-600">
            Ask, share, and swap tips with the community.
          </p>
        </div>
        <NewPostButton />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Category rail */}
        <aside className="w-full flex-shrink-0 lg:w-64">
          <div className="lg:sticky lg:top-24">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">
              Categories
            </h2>
            <CategoryRail activeSlug={category} />
          </div>
        </aside>

        {/* Post list */}
        <div className="min-w-0 flex-1">
          {activeCategory && (
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-stone-900">
                  <span aria-hidden="true" className="mr-2">
                    {activeCategory.emoji}
                  </span>
                  {activeCategory.label}
                </p>
                <p className="text-sm text-stone-500">{activeCategory.blurb}</p>
              </div>
              <Link
                href="/forum"
                className="text-sm font-semibold text-orange-700 hover:text-orange-800"
              >
                All categories
              </Link>
            </div>
          )}

          <SortBar
            sort={sort}
            onChange={(next) => {
              const p = new URLSearchParams(searchParams);
              p.set("sort", next);
              p.delete("page");
              router.push(`/forum?${p.toString()}`, { scroll: false });
            }}
          />

          <PostList
            key={searchKey}
            params={{ category, sort, page, limit: PAGE_SIZE }}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// New Post button (opens sign-in modal when signed out)
// ────────────────────────────────────────────────────────────────────────

function NewPostButton() {
  const { isLoaded, isSignedIn } = useUser();
  const disabled = !isLoaded;

  const inner = (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-60"
    >
      <span aria-hidden="true">＋</span>
      New Post
    </button>
  );

  if (!isSignedIn) {
    return <SignInButton mode="modal">{inner}</SignInButton>;
  }
  return <Link href="/forum/new">{inner}</Link>;
}

// ────────────────────────────────────────────────────────────────────────
// Category rail
// ────────────────────────────────────────────────────────────────────────

function CategoryRail({ activeSlug }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
      <li>
        <CategoryCard
          href="/forum"
          label="All categories"
          emoji="🗂️"
          active={!activeSlug}
        />
      </li>
      {POST_CATEGORIES.map((c) => (
        <li key={c.slug}>
          <CategoryCard
            href={`/forum?category=${c.slug}`}
            label={c.label}
            emoji={c.emoji}
            active={activeSlug === c.slug}
          />
        </li>
      ))}
    </ul>
  );
}

function CategoryCard({ href, label, emoji, active }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors " +
        (active
          ? "border-orange-300 bg-orange-50 font-semibold text-orange-800"
          : "border-orange-100 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50")
      }
    >
      <span aria-hidden="true">{emoji}</span>
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sort bar
// ────────────────────────────────────────────────────────────────────────

function SortBar({ sort, onChange }) {
  const opts = [
    { value: "recent", label: "Recent" },
    { value: "popular", label: "Popular" },
  ];
  return (
    <div className="mb-4 inline-flex rounded-full border border-orange-200 bg-white p-1 text-sm shadow-sm">
      {opts.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={sort === value}
          onClick={() => onChange(value)}
          className={
            "rounded-full px-4 py-1.5 font-semibold transition-colors " +
            (sort === value
              ? "bg-orange-600 text-white"
              : "text-stone-600 hover:text-orange-700")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Post list (fetches + renders)
// ────────────────────────────────────────────────────────────────────────

function PostList({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    // No `setState({status:"loading"})` here — useState already initialized
    // that way, and the parent remounts us via `key={searchKey}` whenever
    // params change, so this effect always starts on a fresh instance.
    let cancelled = false;
    getPosts(params)
      .then((data) => !cancelled && setState({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setState({ status: "error", data: null, error }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") return <ListSkeleton />;
  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-800">Couldn&apos;t load posts.</p>
        <p className="mt-1 text-sm text-red-700">
          {state.error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  const { posts, total, page, pageCount } = state.data;

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
        <p className="text-lg font-semibold text-stone-800">No posts yet</p>
        <p className="mt-2 text-sm text-stone-600">
          Be the first to start a discussion in this category.
        </p>
      </div>
    );
  }

  const goToPage = (n) => {
    const p = new URLSearchParams(searchParams);
    if (n <= 1) p.delete("page");
    else p.set("page", String(n));
    router.push(`/forum?${p.toString()}`, { scroll: false });
  };

  return (
    <>
      <p className="mb-3 text-sm text-stone-500">
        {total} post{total === 1 ? "" : "s"}
      </p>
      <ul className="divide-y divide-orange-100 rounded-2xl border border-orange-100 bg-white shadow-sm">
        {posts.map((post) => (
          <PostRow key={post._id} post={post} />
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-semibold text-stone-700 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-stone-500">Page {page} of {pageCount}</span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-semibold text-stone-700 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

function PostRow({ post }) {
  const cat = categoryFor(post.category);
  const commentCount = 0; // comments come in Class 10
  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {post.isPinned && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Pinned
              </span>
            )}
            {cat && (
              <Link
                href={`/forum?category=${post.category}`}
                scroll={false}
                className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 hover:bg-orange-200"
              >
                {cat.emoji} {cat.label}
              </Link>
            )}
            {(post.tags || []).slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
              >
                #{t}
              </span>
            ))}
          </div>
          <Link
            href={`/forum/${post._id}`}
            className="block text-base font-bold text-stone-900 hover:text-orange-800 sm:text-lg"
          >
            {post.title}
          </Link>
          <p className="mt-1 text-xs text-stone-500">
            by {post.author?.name || "Anonymous"} · {relativeDate(post.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm text-stone-600 sm:flex-col sm:items-end sm:gap-1">
          <span className="inline-flex items-center gap-1" title="Score">
            <span aria-hidden="true">▲</span>
            <span className="font-semibold">{post.score ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <span aria-hidden="true">💬</span>
            <span>{commentCount}</span>
          </span>
        </div>
      </div>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Skeletons
// ────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-stone-200" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full flex-shrink-0 lg:w-64">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <ListSkeleton />
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="animate-pulse divide-y divide-orange-100 rounded-2xl border border-orange-100 bg-white shadow-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="p-5">
          <div className="mb-2 flex gap-2">
            <div className="h-4 w-20 rounded-full bg-orange-100" />
            <div className="h-4 w-16 rounded-full bg-stone-100" />
          </div>
          <div className="h-5 w-3/4 rounded bg-stone-200" />
          <div className="mt-2 h-3 w-1/3 rounded bg-stone-100" />
        </li>
      ))}
    </ul>
  );
}
