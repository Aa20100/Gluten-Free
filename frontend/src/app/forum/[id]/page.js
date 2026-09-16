"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReportButton from "@/components/ReportButton";
import {
  getPostById,
  deletePost,
  getMe,
  votePost,
  pinPost,
  lockPost,
  moderatorDeletePost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
} from "@/lib/api";
import { categoryFor } from "@/lib/postCategories";

// ── Formatters ──────────────────────────────────────────────────────────

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

/** Derive the current user's vote on a post from the vote arrays. */
function userVoteFor(post, dbUserId) {
  if (!post || !dbUserId) return null;
  const uid = String(dbUserId);
  if ((post.upvotes || []).some((u) => String(u) === uid || String(u?._id) === uid)) return "up";
  if ((post.downvotes || []).some((u) => String(u) === uid || String(u?._id) === uid)) return "down";
  return null;
}

function scoreOf(post) {
  return (post?.upvotes?.length || 0) - (post?.downvotes?.length || 0);
}

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

export default function PostDetailPage({ params }) {
  const { id } = use(params);

  const router = useRouter();
  const { isLoaded: authLoaded, getToken } = useAuth();
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  const [post, setPost] = useState({ status: "loading", data: null, error: null });
  const [me, setMe] = useState(null); // full DB user doc (has _id + role)
  const [comments, setComments] = useState({ status: "loading", data: [], error: null });

  // Fetch the post.
  useEffect(() => {
    let cancelled = false;
    getPostById(id)
      .then((data) => !cancelled && setPost({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setPost({ status: "error", data: null, error }));
    return () => { cancelled = true; };
  }, [id]);

  // Fetch comments.
  const reloadComments = () => {
    getComments(id)
      .then((data) => setComments({ status: "success", data, error: null }))
      .catch((error) => setComments({ status: "error", data: [], error }));
  };
  useEffect(() => {
    let cancelled = false;
    getComments(id)
      .then((data) => !cancelled && setComments({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setComments({ status: "error", data: [], error }));
    return () => { cancelled = true; };
  }, [id]);

  // Resolve DB user (for vote state, ownership checks, mod actions).
  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn) return;
    let cancelled = false;
    getMe(getToken)
      .then((doc) => !cancelled && setMe(doc))
      .catch(() => { /* leave me=null → hides personal affordances */ });
    return () => { cancelled = true; };
  }, [authLoaded, userLoaded, isSignedIn, getToken]);

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
            <>
              <PostView
                post={post.data}
                me={me}
                isSignedIn={isSignedIn}
                getToken={getToken}
                onPostChanged={(next) =>
                  setPost({ status: "success", data: next, error: null })
                }
                onDeleted={() => router.push("/forum")}
              />
              <CommentsSection
                postId={String(post.data._id)}
                postLocked={Boolean(post.data.isLocked)}
                comments={comments}
                me={me}
                isSignedIn={isSignedIn}
                getToken={getToken}
                reload={reloadComments}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Post view (hero + body + actions)
// ────────────────────────────────────────────────────────────────────────

function PostView({ post, me, isSignedIn, getToken, onPostChanged, onDeleted }) {
  const cat = categoryFor(post.category);
  const authorName = post.author?.name || "Anonymous";
  const isAuthor = me && String(post.author?._id) === String(me._id);
  const isMod = me?.role === "moderator";

  return (
    <article className="mt-4 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        {post.isPinned && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
            Pinned
          </span>
        )}
        {post.isLocked && (
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-700">
            🔒 Locked
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

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            by <span className="font-medium text-stone-700">{authorName}</span> ·{" "}
            {formatDateTime(post.createdAt)}
            {post.updatedAt && post.updatedAt !== post.createdAt && (
              <span> · edited {formatDateTime(post.updatedAt)}</span>
            )}
          </p>
        </div>

        {/* Voting */}
        <VoteWidget
          post={post}
          me={me}
          isSignedIn={isSignedIn}
          getToken={getToken}
          onPostChanged={onPostChanged}
        />
      </div>

      {(post.tags || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/forum?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      <div className="prose prose-stone mt-6 max-w-none whitespace-pre-line text-stone-800">
        {post.body}
      </div>

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

      {/* Actions row: report + author edit/delete + moderator actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-orange-100 pt-4">
        <ReportButton targetType="post" targetId={String(post._id)} />

        {isAuthor && (
          <>
            <Link
              href={`/forum/${post._id}/edit`}
              className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              Edit
            </Link>
            <AuthorDeleteButton
              postId={String(post._id)}
              getToken={getToken}
              onDeleted={onDeleted}
            />
          </>
        )}

        {isMod && (
          <ModeratorActions
            post={post}
            getToken={getToken}
            onPostChanged={onPostChanged}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </article>
  );
}

function VoteWidget({ post, me, isSignedIn, getToken, onPostChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const myVote = userVoteFor(post, me?._id);
  const disabled = busy || Boolean(post.isLocked);

  const doVote = async (direction) => {
    if (post.isLocked) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await votePost(String(post._id), direction, getToken);
      onPostChanged(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  // Click-active-again = clear; click-inactive = set to that direction.
  const handleClick = (direction) => {
    if (myVote === direction) doVote("clear");
    else doVote(direction);
  };

  const btnBase =
    "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const upActive = myVote === "up";
  const downActive = myVote === "down";

  const inner = (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => handleClick("up")}
        disabled={disabled}
        aria-label="Upvote"
        aria-pressed={upActive}
        className={`${btnBase} ${
          upActive
            ? "border-orange-400 bg-orange-100 text-orange-800"
            : "border-stone-200 bg-white text-stone-500 hover:border-orange-300 hover:text-orange-700"
        }`}
      >
        ▲
      </button>
      <span className="text-sm font-bold text-stone-800">{scoreOf(post)}</span>
      <button
        type="button"
        onClick={() => handleClick("down")}
        disabled={disabled}
        aria-label="Downvote"
        aria-pressed={downActive}
        className={`${btnBase} ${
          downActive
            ? "border-blue-400 bg-blue-100 text-blue-800"
            : "border-stone-200 bg-white text-stone-500 hover:border-blue-300 hover:text-blue-700"
        }`}
      >
        ▼
      </button>
      {error && (
        <span className="text-[10px] text-red-700 max-w-24 text-center">
          {error.message}
        </span>
      )}
    </div>
  );

  if (!isSignedIn) {
    // Wrap the whole widget so clicks anywhere prompt sign-in.
    return (
      <SignInButton mode="modal">
        <div className="cursor-pointer">{inner}</div>
      </SignInButton>
    );
  }
  return inner;
}

function AuthorDeleteButton({ postId, getToken, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const handleClick = async () => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePost(postId, getToken);
      onDeleted();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <span className="w-full text-sm text-red-700">
          {error.message || "Delete failed."}
        </span>
      )}
    </>
  );
}

function ModeratorActions({ post, getToken, onPostChanged, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const wrap = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ml-auto flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <span className="text-[10px] font-bold uppercase text-amber-900">
        🛡 Moderator
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          wrap(async () => {
            const updated = await pinPost(String(post._id), getToken);
            onPostChanged(updated);
          })
        }
        className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
      >
        {post.isPinned ? "Unpin" : "Pin"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          wrap(async () => {
            const updated = await lockPost(String(post._id), getToken);
            onPostChanged(updated);
          })
        }
        className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
      >
        {post.isLocked ? "Unlock" : "Lock"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Delete this post as a moderator?")) return;
          await wrap(async () => {
            await moderatorDeletePost(String(post._id), getToken);
            onDeleted();
          });
        }}
        className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
      {error && (
        <span className="w-full text-xs text-red-700">
          {error.message || "Moderator action failed."}
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Comments
// ────────────────────────────────────────────────────────────────────────

/**
 * Group a flat comment list into { root, replies[] } clusters.
 * "Root" = top-level (parent === null). All descendants of a root render
 * indented at level 1 regardless of nesting depth (as spec'd).
 */
function nestComments(comments) {
  const byId = new Map(comments.map((c) => [String(c._id), c]));

  const rootIdOf = (c) => {
    let cur = c;
    // Cap the walk to avoid pathological loops (shouldn't happen but be safe).
    for (let i = 0; i < 32 && cur?.parent; i++) {
      const p = byId.get(String(cur.parent));
      if (!p) return String(cur._id); // orphan → treat as root
      cur = p;
    }
    return String(cur._id);
  };

  const groups = new Map();
  for (const c of comments) {
    const rootId = rootIdOf(c);
    if (!groups.has(rootId)) groups.set(rootId, { root: null, replies: [] });
    if (String(c._id) === rootId) groups.get(rootId).root = c;
    else groups.get(rootId).replies.push(c);
  }
  return [...groups.values()].filter((g) => g.root);
}

function CommentsSection({
  postId,
  postLocked,
  comments,
  me,
  isSignedIn,
  getToken,
  reload,
}) {
  const groups = useMemo(
    () => (comments.status === "success" ? nestComments(comments.data) : []),
    [comments]
  );

  return (
    <section
      aria-labelledby="comments-heading"
      className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="comments-heading" className="text-lg font-bold text-stone-900">
          Comments{" "}
          {comments.status === "success" && (
            <span className="text-sm font-normal text-stone-500">
              ({comments.data.length})
            </span>
          )}
        </h2>
        {postLocked && (
          <span className="text-xs font-semibold text-stone-500">
            🔒 Post locked — no new comments
          </span>
        )}
      </div>

      {/* New comment box */}
      {isSignedIn && !postLocked ? (
        <NewCommentBox postId={postId} getToken={getToken} onSaved={reload} />
      ) : !isSignedIn ? (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <p>Sign in to join the discussion.</p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      ) : null}

      <div className="mt-6">
        {comments.status === "loading" && (
          <p className="text-sm text-stone-500">Loading comments…</p>
        )}
        {comments.status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-800">
              Couldn&apos;t load comments.
            </p>
            <p className="mt-1 text-red-700">
              {comments.error?.message || "Unknown error"}
            </p>
          </div>
        )}
        {comments.status === "success" && groups.length === 0 && (
          <p className="text-sm text-stone-500">
            No comments yet. Be the first!
          </p>
        )}
        {comments.status === "success" && groups.length > 0 && (
          <ul className="space-y-6">
            {groups.map(({ root, replies }) => (
              <li key={root._id}>
                <CommentItem
                  comment={root}
                  postId={postId}
                  postLocked={postLocked}
                  me={me}
                  isSignedIn={isSignedIn}
                  getToken={getToken}
                  reload={reload}
                />
                {replies.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-orange-100 pl-4 sm:pl-6">
                    {replies
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt) - new Date(b.createdAt)
                      )
                      .map((r) => (
                        <li key={r._id}>
                          <CommentItem
                            comment={r}
                            postId={postId}
                            postLocked={postLocked}
                            me={me}
                            isSignedIn={isSignedIn}
                            getToken={getToken}
                            reload={reload}
                            isReply
                          />
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  postId,
  postLocked,
  me,
  isSignedIn,
  getToken,
  reload,
  isReply,
}) {
  const [likeState, setLikeState] = useState({
    count: comment.likes?.length || 0,
    likedByMe:
      me &&
      (comment.likes || []).some(
        (u) => String(u) === String(me._id) || String(u?._id) === String(me._id)
      ),
  });
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isAuthor = me && String(comment.author?._id) === String(me._id) && !comment.deleted;

  const handleLike = async () => {
    if (!isSignedIn) return;
    // Optimistic
    const wasLiked = likeState.likedByMe;
    setLikeState({
      count: wasLiked ? likeState.count - 1 : likeState.count + 1,
      likedByMe: !wasLiked,
    });
    try {
      const res = await likeComment(String(comment._id), getToken);
      setLikeState({ count: res.likeCount, likedByMe: res.likedByMe });
    } catch (err) {
      // Roll back
      setLikeState({ count: likeState.count, likedByMe: wasLiked });
      setError(err);
    }
  };

  const handleSaveEdit = async () => {
    if (editBody.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await updateComment(String(comment._id), { body: editBody.trim() }, getToken);
      setEditing(false);
      reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment? Replies will remain.")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteComment(String(comment._id), getToken);
      reload();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const authorLabel = comment.deleted
    ? "[deleted]"
    : comment.author?.name || "Anonymous";
  const bodyText = comment.deleted ? "[deleted]" : comment.body;

  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (isReply
          ? "border-orange-50 bg-amber-50/40"
          : "border-orange-100 bg-amber-50/60")
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className={"font-semibold " + (comment.deleted ? "text-stone-400 italic" : "text-stone-900")}>
            {authorLabel}
          </span>
          <span className="text-xs text-stone-500">
            {relativeDate(comment.createdAt)}
          </span>
          {comment.updatedAt && comment.updatedAt !== comment.createdAt && !comment.deleted && (
            <span className="text-xs text-stone-400">· edited</span>
          )}
        </div>
        {!comment.deleted && (
          <ReportButton targetType="comment" targetId={String(comment._id)} compact />
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditBody(comment.body);
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || editBody.trim().length === 0}
              onClick={handleSaveEdit}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className={"mt-2 whitespace-pre-line " + (comment.deleted ? "text-stone-400 italic" : "text-stone-800")}>
          {bodyText}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700">
          {error.message || "Something went wrong."}
        </p>
      )}

      {!editing && !comment.deleted && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <LikeButton
            count={likeState.count}
            liked={likeState.likedByMe}
            isSignedIn={isSignedIn}
            onClick={handleLike}
          />
          {!postLocked && (
            <ReplyButton
              isSignedIn={isSignedIn}
              onClick={() => setReplyOpen((v) => !v)}
              active={replyOpen}
            />
          )}
          {isAuthor && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-semibold text-stone-500 hover:text-orange-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="font-semibold text-stone-500 hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {replyOpen && isSignedIn && !postLocked && (
        <div className="mt-3">
          <NewCommentBox
            postId={postId}
            parent={String(comment._id)}
            placeholder={`Replying to ${authorLabel}…`}
            compact
            getToken={getToken}
            onSaved={() => {
              setReplyOpen(false);
              reload();
            }}
            onCancel={() => setReplyOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function LikeButton({ count, liked, isSignedIn, onClick }) {
  const btn = (
    <button
      type="button"
      onClick={isSignedIn ? onClick : undefined}
      aria-pressed={liked}
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors " +
        (liked
          ? "bg-red-100 text-red-700 hover:bg-red-200"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200")
      }
    >
      <span aria-hidden="true">{liked ? "❤" : "♡"}</span>
      {count}
    </button>
  );
  if (!isSignedIn) return <SignInButton mode="modal">{btn}</SignInButton>;
  return btn;
}

function ReplyButton({ isSignedIn, onClick, active }) {
  const btn = (
    <button
      type="button"
      onClick={isSignedIn ? onClick : undefined}
      className={
        "font-semibold transition-colors " +
        (active ? "text-orange-700" : "text-stone-500 hover:text-orange-700")
      }
    >
      Reply
    </button>
  );
  if (!isSignedIn) return <SignInButton mode="modal">{btn}</SignInButton>;
  return btn;
}

function NewCommentBox({
  postId,
  parent = null,
  placeholder = "Add a comment…",
  compact,
  getToken,
  onSaved,
  onCancel,
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = body.trim().length > 0 && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await createComment(
        { post: postId, body: body.trim(), ...(parent ? { parent } : {}) },
        getToken
      );
      setBody("");
      onSaved();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={"space-y-2 " + (compact ? "" : "mt-4")}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      {error && (
        <p className="text-sm text-red-700">
          {error.message || "Couldn't post."}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Posting…" : parent ? "Reply" : "Post comment"}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Skeleton / error
// ────────────────────────────────────────────────────────────────────────

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
