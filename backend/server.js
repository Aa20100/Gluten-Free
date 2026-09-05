import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Permissive CORS for now — we'll tighten this once the frontend origin is
// known and stable.
app.use(cors());

// Parse JSON request bodies.
app.use(express.json());

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
