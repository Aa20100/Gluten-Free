import mongoose from "mongoose";

import Report from "../models/report.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { getOrCreateUser } from "../utils/getOrCreateUser.js";

// Model lookup for the polymorphic target field. Keeps the switch out of
// the controller body.
const TARGET_MODELS = {
  post: Post,
  comment: Comment,
};

/**
 * POST /api/reports — protected. Body: { targetType, targetId, reason }.
 *
 * Creates the report and atomically bumps `reportCount` on the target
 * doc. If the target doesn't exist, no record is created and we 404 —
 * we don't want stale reports pointing at nothing.
 */
export async function createReport(req, res, next) {
  try {
    const { targetType, targetId, reason } = req.body;

    if (!TARGET_MODELS[targetType]) {
      return res.status(400).json({
        error: {
          message: '`targetType` must be "post" or "comment"',
          status: 400,
        },
      });
    }
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({
        error: { message: `Invalid targetId: ${targetId}`, status: 400 },
      });
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: "`reason` is required and must be a non-empty string",
          status: 400,
        },
      });
    }

    // Bump reportCount on the target as part of creation. `$inc` returns
    // the pre-update doc by default; we use its existence to confirm the
    // target is real.
    const Model = TARGET_MODELS[targetType];
    const target = await Model.findByIdAndUpdate(
      targetId,
      { $inc: { reportCount: 1 } },
      { new: true }
    );
    if (!target) {
      return res.status(404).json({
        error: {
          message: `${targetType} not found: ${targetId}`,
          status: 404,
        },
      });
    }

    const user = await getOrCreateUser(req.auth.userId);
    const report = await Report.create({
      reporter: user._id,
      targetType,
      targetId,
      reason: reason.trim(),
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports — moderator only. Newest first, populated with the
 * reporter's display name. Callers get a compact list; individual target
 * documents can be fetched separately when opening a case.
 */
export async function listReports(_req, res, next) {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .populate({ path: "reporter", select: "name" });

    res.json(reports);
  } catch (err) {
    next(err);
  }
}
