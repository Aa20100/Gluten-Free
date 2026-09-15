import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import { connectDB } from "./config/db.js";
// Importing initializes the Cloudinary SDK once from env vars, and logs
// a warning early if CLOUDINARY_* keys are missing.
import "./config/cloudinary.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Permissive CORS for now — we'll tighten this once the frontend origin is
// known and stable. The default config allows the Authorization header,
// which the frontend uses to send Clerk session tokens.
app.use(cors());

// Parse JSON request bodies.
app.use(express.json());

// Populate req.auth on every request from the Clerk session token (cookie
// or `Authorization: Bearer <token>`). Does not reject — per-route
// middleware (middleware/requireAuth.js) enforces "must be signed in".
// Reads CLERK_SECRET_KEY + CLERK_PUBLISHABLE_KEY from the environment;
// registration is skipped when either is missing so the rest of the API
// keeps working during initial setup. Protected routes will 401 until
// the keys are present.
if (process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  app.use(clerkMiddleware());
} else {
  console.warn(
    "[auth] CLERK_SECRET_KEY and/or CLERK_PUBLISHABLE_KEY not set — " +
      "clerkMiddleware() skipped. Protected routes will return 401."
  );
}

// All API routes are mounted under /api. Individual resource routers are
// aggregated inside routes/index.js.
app.use("/api", apiRouter);

// Centralized error handler must be registered LAST.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

start();

