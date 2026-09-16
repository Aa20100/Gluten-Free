import { Router } from "express";

import {
  getCommentsForPost,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
} from "../controllers/comment.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/post/:postId", getCommentsForPost);

router.post("/", requireAuth, createComment);
router.put("/:id", requireAuth, updateComment);
router.delete("/:id", requireAuth, deleteComment);
router.post("/:id/like", requireAuth, likeComment);

export default router;
