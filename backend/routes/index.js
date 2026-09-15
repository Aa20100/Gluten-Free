import { Router } from "express";

import restaurantRoutes from "./restaurant.routes.js";
import userRoutes from "./user.routes.js";
import reviewRoutes from "./review.routes.js";

const router = Router();

// Simple liveness check so we can verify the API is reachable.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Resource routers — one per resource, all mounted under /api by server.js.
router.use("/restaurants", restaurantRoutes);
router.use("/users", userRoutes);
router.use("/reviews", reviewRoutes);

export default router;
