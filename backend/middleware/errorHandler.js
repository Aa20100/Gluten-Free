/**
 * Centralized Express error handler. Must be registered LAST, after all
 * routes and other middleware, so errors from any of them funnel through it.
 *
 * Usage:
 *   throw new Error("Something broke")            // -> 500
 *   const err = new Error("Not found"); err.status = 404; throw err;  // -> 404
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log server-side; keep response body minimal.
  console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  if (status >= 500) {
    console.error(err.stack);
  }

  res.status(status).json({
    error: {
      message,
      status,
    },
  });
}
