import rateLimit from "express-rate-limit";

// src/config/rateLimiter.config.mjs

export const rateLimiter = (maxRequests = 100) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    statusCode: 429,
    legacyHeaders: false,
    headers: false,
    message: {
      message: "Trop de requêtes, veuillez réessayer plus tard.",
    },
    handler: (_req, res) => {
      res.status(429).json({
        message: "Trop de requêtes, veuillez réessayer plus tard.",
      });
    },
  });
