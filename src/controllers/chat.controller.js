/**
 * src/controllers/chat.controller.js
 *
 * Handles request validation, sets SSE headers, and delegates streaming
 * to ai.service.js.  Token usage is attached to res.locals so the logger
 * middleware can include it in the access log.
 */

const { streamAIReply } = require("../services/ai.service");

/**
 * POST /api/chat
 *
 * Expected body:
 *   { "message": "user message here" }
 *
 * Response: Server-Sent Events stream
 *   data: { "chunk": "<text fragment>" }      — repeated
 *   data: { "done": true, "usage": { ... } }  — terminal event
 *
 * Clients should use the EventSource API or fetch() with a ReadableStream.
 */
async function handleChat(req, res, next) {
  try {
    const { message } = req.body;

    // ── Input validation (before flushing headers) ─────────────────────────
    if (!message || typeof message !== "string") {
      const err = new Error('Request body must include a "message" string.');
      err.statusCode = 400;
      return next(err);
    }

    const trimmed = message.trim();

    if (trimmed.length === 0) {
      const err = new Error('"message" must not be blank.');
      err.statusCode = 400;
      return next(err);
    }

    if (trimmed.length > 1000) {
      const err = new Error('"message" must be 1000 characters or fewer.');
      err.statusCode = 400;
      return next(err);
    }

    // ── Set SSE headers and flush immediately ──────────────────────────────
    // Headers must be sent before any streaming begins.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx proxy buffering
    res.flushHeaders();

    // ── Stream response ────────────────────────────────────────────────────
    const usage = await streamAIReply(trimmed, res);

    // Attach usage to res.locals so the logger can pick it up after finish
    res.locals.tokenUsage = usage;
  } catch (err) {
    // If headers haven't been flushed yet, delegate to error middleware.
    // If they have, send an SSE error event so the client can handle it.
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Stream error occurred." })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
}

module.exports = { handleChat };
