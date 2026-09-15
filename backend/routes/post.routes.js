import { Router } from "express";

import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
} from "../controllers/post.controller.js";
import {
  validateCreatePost,
  validateUpdatePost,
} from "../validators/post.validator.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Public listing + single fetch.
router.get("/", getPosts);

// Protected — must come BEFORE `/:id` so /me isn't captured by the param.
router.get("/me", requireAuth, getMyPosts);

router.get("/:id", getPostById);
router.post("/", requireAuth, validateCreatePost, createPost);
router.put("/:id", requireAuth, validateUpdatePost, updatePost);
router.delete("/:id", requireAuth, deletePost);

export default router;
