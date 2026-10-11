"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getPosts } from "@/lib/api";
import { categoryFor } from "@/lib/postCategories";

const MAX_POSTS = 3;

function relativeDate(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RecentForumPosts() {
  const [state, setState] = useState({ status: "loading", posts: [] });

  useEffect(() => {
    let cancelled = false;
    getPosts({ sort: "recent", limit: MAX_POSTS })
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ok", posts: data?.posts || [] });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error", posts: [] });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white px-5 shadow-sm sm:px-6">
        {Array.from({ length: MAX_POSTS }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center justify-between gap-3 border-b border-emerald-100 py-4 last:border-b-0"
          >
            <div className="h-4 w-2/3 rounded bg-stone-100" />
            <div className="h-3 w-24 rounded bg-stone-100" />
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-sm text-stone-600">
        Couldn&apos;t load recent posts right now.{" "}
        <Link href="/forum" className="font-semibold text-emerald-700 hover:underline">
          Go to the forum →
        </Link>
      </p>
    );
  }

  if (state.posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-sm text-stone-600">
        No posts yet.{" "}
        <Link href="/forum/new" className="font-semibold text-emerald-700 hover:underline">
          Start the first one →
        </Link>
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white px-5 shadow-sm sm:px-6">
      {state.posts.map((post) => {
        const cat = categoryFor(post.category);
        return (
          <Link
            key={post._id}
            href={`/forum/${post._id}`}
            className="flex flex-col gap-2 border-b border-emerald-100 py-4 last:border-b-0 hover:bg-emerald-50/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {cat?.label || post.category}
              </span>
              <h3 className="font-medium text-stone-900">{post.title}</h3>
            </div>
            <div className="text-sm text-stone-500">
              {post.author?.name || "Anonymous"} · {relativeDate(post.createdAt)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
