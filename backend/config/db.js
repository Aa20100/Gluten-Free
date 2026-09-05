import mongoose from "mongoose";

/**
 * Connect to MongoDB using MONGODB_URI from the environment.
 * Exits the process if the connection fails so the server never runs in a
 * half-broken state.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("[db] MONGODB_URI is not set. Add it to your .env file.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[db] MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
}
