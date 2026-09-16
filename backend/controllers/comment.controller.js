import mongoose from "mongoose";

import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

// Populate only what listings need.
const AUTHOR_POPULATE = { path: "author", select: "name" };

function badId(res, id) {
  return res.status(400).json({
    error: { message: `Invalid id: ${id}`, status: 400 },
  });
}
function notFound(res, what, id) {
  return res.status(404).json({
    error: { message: `${what} not found: ${id}`, status: 404 },
  });
}
function forbidden(res, message = "Not allowed") {
  return res.status(403).json({ error: { message, status: 403 } });
}

/**
 * Redact the author + body when a comment is soft-deleted so the wire
 * response doesn't leak the original text or the real name. The doc
 * stays in place so replies still have a parent to hang off of.
 */
function serialize(comment) {
  const obj = typeof comment.toObject === "function" ? comment.toObject() : comment;
  if (obj.deleted) {
    return {
      ...obj,
      body: "[deleted]",
      author: obj.author ? { _id: obj.author._id || obj.author, name: "[deleted]" } : null,
    };
  }
  return obj;
}

/** GET /api/comments/post/:postId — public. Flat list; frontend nests. */
export async function getCommentsForPost(req, res, next) {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) return badId(res, postId);

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate(AUTHOR_POPULATE);

    res.json(comments.map(serialize));
  } catch (err) {
    next(err);
  }
}

/** POST /api/comments — protected. Body: { post, body, parent? } */
export async function createComment(req, res, next) {
  try {
    const { post, body, parent } = req.body;

    if (!mongoose.isValidObjectId(post)) return badId(res, post);
    if (typeof body !== "string" || body.trim().length === 0) {
      return res.status(400).json({
        error: { message: "`body` is required and must be a non-empty string", status: 400 },
      });
    }

    const postDoc = await Post.findById(post);
    if (!postDoc) return notFound(res, "Post", post);
    // Locked posts reject new comments.
    if (postDoc.isLocked) {
      return forbidden(res, "This post is locked; new comments are not allowed");
    }

    if (parent != null) {
      if (!mongoose.isValidObjectId(parent)) return badId(res, parent);
      const parentDoc = await Comment.findById(parent);
      if (!parentDoc) return notFound(res, "Parent comment", parent);
      // Reply must belong to the same post as its parent — prevents a
      // caller from grafting a reply onto a comment under a different post.
      if (!parentDoc.post.equals(postDoc._id)) {
        return res.status(400).json({
          error: {
            message: "Parent comment does not belong to this post",
            status: 400,
          },
        });
      }
    }

    const user = await getOrCreateUser(req.auth.userId);
    const created = await Comment.create({
      post: postDoc._id,
      author: user._id,
      parent: parent || null,
      body: body.trim(),
    });

    const populated = await Comment.findById(created._id).populate(AUTHOR_POPULATE);
    res.status(201).json(serialize(populated));
  } catch (err) {
    next(err);
  }
}

/** PUT /api/comments/:id — protected + author only. Partial. */
export async function updateComment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const comment = await Comment.findById(id);
    if (!comment) return notFound(res, "Comment", id);

    const user = await getOrCreateUser(req.auth.userId);
    if (!comment.author.equals(user._id)) {
      return forbidden(res, "You can only edit your own comments");
    }

    if ("body" in req.body) {
      if (typeof req.body.body !== "string" || req.body.body.trim().length === 0) {
        return res.status(400).json({
          error: { message: "`body` must be a non-empty string", status: 400 },
        });
      }
      comment.body = req.body.body.trim();
      // Editing an intentionally-deleted comment un-deletes it. If we
      // ever want a "restore" separate from edit, split this.
      comment.deleted = false;
    }

    await comment.save();

    const populated = await Comment.findById(comment._id).populate(AUTHOR_POPULATE);
    res.json(serialize(populated));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/comments/:id — protected + author only. Soft-delete: mark
 * `deleted: true`, replace body with a placeholder, keep the doc so
 * child replies still have a parent.
 */
export async function deleteComment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const comment = await Comment.findById(id);
    if (!comment) return notFound(res, "Comment", id);

    const user = await getOrCreateUser(req.auth.userId);
    if (!comment.author.equals(user._id)) {
      return forbidden(res, "You can only delete your own comments");
    }

    comment.deleted = true;
    comment.body = "[deleted]";
    await comment.save();

    // Return the (redacted) doc rather than 204 so the client can update
    // the row in place without a refetch.
    const populated = await Comment.findById(comment._id).populate(AUTHOR_POPULATE);
    res.json(serialize(populated));
  } catch (err) {
    next(err);
  }
}

/** POST /api/comments/:id/like — protected. Toggles the like. */
export async function likeComment(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const comment = await Comment.findById(id);
    if (!comment) return notFound(res, "Comment", id);

    const user = await getOrCreateUser(req.auth.userId);
    const already = comment.likes.some((u) => u.equals(user._id));

    // $addToSet / $pull do the toggle atomically without a race.
    await Comment.findByIdAndUpdate(
      id,
      already
        ? { $pull: { likes: user._id } }
        : { $addToSet: { likes: user._id } }
    );

    const populated = await Comment.findById(id).populate(AUTHOR_POPULATE);
    res.json({
      ...serialize(populated),
      likeCount: populated.likes.length,
      likedByMe: !already,
    });
  } catch (err) {
    next(err);
  }
}
