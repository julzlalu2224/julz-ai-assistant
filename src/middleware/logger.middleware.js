/**
 * src/middleware/logger.middleware.js
 *
 * Structured access logger.
 *
 * Logs each completed request in a consistent format:
 *   [ISO timestamp] METHOD /path STATUS DURATIONms | tokens: prompt=X completion=Y total=Z
 *
 * Token counts are only appended when the AI service attaches usage data to
 * res.locals.tokenUsage (i.e. for POST /api/chat requests).
 *
 * No third-party logging library is required — uses console.log so output
 * is captured automatically by platform log aggregators (Render, Railway, etc.).
 */

/**
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
function loggerMiddleware(req, res, next) {
  const startedAt = Date.now();

  // "finish" fires after the last byte has been flushed to the client.
  // This works for both regular JSON responses and SSE streams.
  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    const ts = new Date().toISOString();
    const usage = res.locals.tokenUsage;

    // Build optional token usage string
    const tokenStr = usage
      ? ` | tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`
      : "";

    // Colour-code by status range for quick human scanning in terminal
    const status = res.statusCode;
    const statusLabel =
      status >= 500 ? `\x1b[31m${status}\x1b[0m` : // red
      status >= 400 ? `\x1b[33m${status}\x1b[0m` : // yellow
      status >= 300 ? `\x1b[36m${status}\x1b[0m` : // cyan
                     `\x1b[32m${status}\x1b[0m`;  // green

    console.log(
      `[${ts}] ${req.method} ${req.path} ${statusLabel} ${duration}ms${tokenStr}`
    );
  });

  next();
}

module.exports = loggerMiddleware;
