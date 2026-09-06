import { Router } from "express";

import { getMe } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/me", requireAuth, getMe);

export default router;
