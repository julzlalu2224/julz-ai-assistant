/**
 * server.js
 *
 * Application entry point.
 * Wires together Express, middleware, routes, and starts the HTTP server.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const corsOptions = require("./src/config/cors.config");
const chatRoutes = require("./src/routes/chat.routes");
const loggerMiddleware = require("./src/middleware/logger.middleware");
const errorMiddleware = require("./src/middleware/error.middleware");
const { getTokenStats } = require("./src/services/ai.service");

// ── Validate required environment variables at startup ─────────────────────
if (!process.env.OPENAI_API_KEY) {
  console.error("[FATAL] OPENAI_API_KEY is not set. Check your .env file.");
  process.exit(1);
}

// ── App setup ──────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy when deployed behind Render / Railway / Vercel etc.
// Required for express-rate-limit to read the real client IP.
app.set("trust proxy", 1);

// ── Global middleware ──────────────────────────────────────────────────────
app.use(cors(corsOptions));               // CORS
app.use(express.json({ limit: "10kb" })); // Parse JSON bodies (hard limit)
app.use(loggerMiddleware);                // Structured access logging

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/chat", chatRoutes);

// Token usage stats — in-memory snapshot (resets on restart)
app.get("/api/stats", (_req, res) => {
  res.json(getTokenStats());
});

// Health-check endpoint — useful for platform uptime monitors
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404 for anything not matched above
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Central error handler (must be last) ───────────────────────────────────
app.use(errorMiddleware);

// ── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] James's AI assistant running on port ${PORT}`);
  console.log(`[server] Allowed origin(s): ${process.env.FRONTEND_URL}`);
});
