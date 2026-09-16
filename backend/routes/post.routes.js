import { Router } from "express";

import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
  votePost,
  pinPost,
  lockPost,
  moderatorDeletePost,
} from "../controllers/post.controller.js";
import {
  validateCreatePost,
  validateUpdatePost,
} from "../validators/post.validator.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireModerator } from "../middleware/requireModerator.js";
import { imagesUpload } from "../middleware/upload.js";
import { normalizePostBody } from "../middleware/normalizePostBody.js";

const router = Router();

// Public listing + single fetch.
router.get("/", getPosts);

// Protected — must come BEFORE `/:id` so /me isn't captured by the param.
router.get("/me", requireAuth, getMyPosts);

router.get("/:id", getPostById);

// Create + update accept EITHER JSON or multipart/form-data. When multipart,
// multer parses files into req.files and non-file fields into req.body as
// strings; normalizePostBody then coerces `tags` (csv) and `imageUrls` (JSON)
// back to arrays before the validator inspects the payload.
router.post(
  "/",
  requireAuth,
  imagesUpload,
  normalizePostBody,
  validateCreatePost,
  createPost
);
router.put(
  "/:id",
  requireAuth,
  imagesUpload,
  normalizePostBody,
  validateUpdatePost,
  updatePost
);

router.delete("/:id", requireAuth, deletePost);

// Voting: any signed-in user.
router.post("/:id/vote", requireAuth, votePost);

// Moderator actions (pin toggle / lock toggle / delete any post).
router.post("/:id/pin", requireAuth, requireModerator, pinPost);
router.post("/:id/lock", requireAuth, requireModerator, lockPost);
router.delete("/:id/moderate", requireAuth, requireModerator, moderatorDeletePost);

export default router;
