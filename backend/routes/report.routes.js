import { Router } from "express";

import { createReport, listReports } from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireModerator } from "../middleware/requireModerator.js";

const router = Router();

router.post("/", requireAuth, createReport);
router.get("/", requireAuth, requireModerator, listReports);

export default router;
