import mongoose from "mongoose";

import Post from "../models/post.model.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";
import { uploadFilesToCloudinary } from "../utils/uploadToCloudinary.js";

// ── Small helpers ──────────────────────────────────────────────────────

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badId(res, id) {
  return res.status(400).json({
    error: { message: `Invalid post id: ${id}`, status: 400 },
  });
}

function notFound(res, id) {
  return res.status(404).json({
    error: { message: `Post not found: ${id}`, status: 404 },
  });
}

function forbidden(res, message = "Not allowed") {
  return res.status(403).json({ error: { message, status: 403 } });
}

// Populate the author with just the name — that's all a listing needs.
const AUTHOR_POPULATE = { path: "author", select: "name" };

// Cap on limit so a caller can't ask for a million rows in one shot.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// ── Handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/posts
 *
 * Optional query params (all combinable):
 *   category  exact match on the category enum
 *   tag       exact match on any of the post's tags
 *   q         case-insensitive substring match on title OR body
 *   sort      "recent" (default) | "popular"
 *   page      1-based (default 1)
 *   limit     default 20, capped at 100
 *
 * Pinned posts always come first, regardless of sort, by prepending
 * `isPinned: -1` to the sort spec. Uses aggregation so we can sort by
 * the virtual `score` (which doesn't exist on the doc) for "popular".
 *
 * Response: { posts, total, page, limit, pageCount }
 */
export async function getPosts(req, res, next) {
  try {
    const { category, tag, q, sort = "recent" } = req.query;

    const pageN = Math.max(1, Number(req.query.page) || 1);
    const limitN = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT)
    );
    const skip = (pageN - 1) * limitN;

    const filter = {};
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ title: rx }, { body: rx }];
    }

    const sortStage =
      sort === "popular"
        ? { isPinned: -1, score: -1, createdAt: -1 }
        : { isPinned: -1, createdAt: -1 };

    // Two round-trips in parallel: the paginated slice + the total count.
    // countDocuments works on the original filter (no need to project score
    // for it).
    const [postsRaw, total] = await Promise.all([
      Post.aggregate([
        { $match: filter },
        {
          $addFields: {
            score: {
              $subtract: [
                { $size: { $ifNull: ["$upvotes", []] } },
                { $size: { $ifNull: ["$downvotes", []] } },
              ],
            },
          },
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limitN },
      ]),
      Post.countDocuments(filter),
    ]);

    // Populate the author (aggregate results are plain objects, so run
    // Post.populate over the array).
    const posts = await Post.populate(postsRaw, AUTHOR_POPULATE);

    res.json({
      posts,
      total,
      page: pageN,
      limit: limitN,
      pageCount: Math.max(1, Math.ceil(total / limitN)),
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/posts/:id — public */
export async function getPostById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const post = await Post.findById(id).populate(AUTHOR_POPULATE);
    if (!post) return notFound(res, id);

    res.json(post);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/posts — protected. Accepts either JSON or multipart/form-data.
 *
 * When multipart, image files arrive on req.files (as multer buffers) and
 * we upload them to Cloudinary here. Any `imageUrls` on the body are
 * treated as already-hosted URLs (rare on create, common on future
 * "share this image" flows) and get merged with the freshly-uploaded
 * ones — files first, so ordering in the UI is predictable.
 */
export async function createPost(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);
    const { title, body, category, tags = [], imageUrls = [] } = req.body;

    const uploadedUrls = await uploadFilesToCloudinary(req.files);
    const finalImageUrls = [...uploadedUrls, ...imageUrls];

    const created = await Post.create({
      title,
      body,
      category,
      tags,
      imageUrls: finalImageUrls,
      author: user._id,
    });

    const populated = await Post.findById(created._id).populate(AUTHOR_POPULATE);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/posts/:id — protected + author-only */
export async function updatePost(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const post = await Post.findById(id);
    if (!post) return notFound(res, id);

    const user = await getOrCreateUser(req.auth.userId);
    if (!post.author.equals(user._id)) {
      return forbidden(res, "You can only edit your own posts");
    }

    // Apply only fields that were sent. Vote/mod fields (upvotes, downvotes,
    // isPinned, isLocked, reportCount) aren't editable via this endpoint —
    // they'll get their own routes later.
    for (const key of ["title", "body", "category", "tags"]) {
      if (key in req.body) post[key] = req.body[key];
    }

    // Image handling on update:
    //   - If new files were uploaded, push their Cloudinary URLs.
    //   - If the client sent `imageUrls`, treat it as the set they want to
    //     KEEP (they may have removed some client-side). New uploads
    //     append to that kept set.
    //   - If neither is present, leave the existing imageUrls alone.
    const uploadedUrls = await uploadFilesToCloudinary(req.files);
    const clientSentImageUrls = "imageUrls" in req.body;
    if (clientSentImageUrls || uploadedUrls.length > 0) {
      const kept = clientSentImageUrls ? req.body.imageUrls : post.imageUrls;
      post.imageUrls = [...(kept || []), ...uploadedUrls];
    }

    await post.save();

    const populated = await Post.findById(post._id).populate(AUTHOR_POPULATE);
    res.json(populated);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/posts/:id — protected + author-only (moderator role TBD) */
export async function deletePost(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res, id);

    const post = await Post.findById(id);
    if (!post) return notFound(res, id);

    const user = await getOrCreateUser(req.auth.userId);
    if (!post.author.equals(user._id)) {
      return forbidden(res, "You can only delete your own posts");
    }

    await post.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/posts/me — protected */
export async function getMyPosts(req, res, next) {
  try {
    const user = await getOrCreateUser(req.auth.userId);

    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate(AUTHOR_POPULATE);

    res.json(posts);
  } catch (err) {
    next(err);
  }
}
