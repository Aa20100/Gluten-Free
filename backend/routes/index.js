import { Router } from "express";

// Per-resource route modules will be imported and mounted here as we add them.
// Example (future):
//   import restaurantRoutes from "./restaurants.js";
//   router.use("/restaurants", restaurantRoutes);

const router = Router();

// Simple liveness check so we can verify the API is reachable before any
// resources exist.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
