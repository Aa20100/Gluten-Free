import { Router } from "express";

import restaurantRoutes from "./restaurant.routes.js";
import userRoutes from "./user.routes.js";
import reviewRoutes from "./review.routes.js";
import postRoutes from "./post.routes.js";
import commentRoutes from "./comment.routes.js";
import reportRoutes from "./report.routes.js";

const router = Router();

// Simple liveness check so we can verify the API is reachable.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Resource routers — one per resource, all mounted under /api by server.js.
router.use("/restaurants", restaurantRoutes);
router.use("/users", userRoutes);
router.use("/reviews", reviewRoutes);
router.use("/posts", postRoutes);
router.use("/comments", commentRoutes);
router.use("/reports", reportRoutes);

export default router;
