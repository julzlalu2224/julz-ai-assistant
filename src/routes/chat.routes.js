/**
 * src/routes/chat.routes.js
 *
 * Mounts the /api/chat endpoint and attaches the rate limiter.
 */

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { handleChat } = require("../controllers/chat.controller");

const router = Router();

// ── Rate limiter ───────────────────────────────────────────────────────────
// 100 requests per 15-minute window per IP.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: "Too many requests — please try again in a few minutes.",
  },
});

// ── Route ──────────────────────────────────────────────────────────────────
router.post("/", chatLimiter, handleChat);

module.exports = router;
