/**
 * src/middleware/error.middleware.js
 *
 * Centralised error handler.  All errors thrown or passed to next() land here.
 * Sends a clean JSON response so the frontend never sees an HTML stack trace.
 */

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  // Log the full error server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: err.message || "Internal server error",
  });
}

module.exports = errorMiddleware;
