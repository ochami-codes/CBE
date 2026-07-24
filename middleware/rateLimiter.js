// middleware/rateLimiter.js

import rateLimit from "express-rate-limit";

const defaultOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
};

export const loginLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message:
      "Too many failed login attempts. Please try again in 15 minutes.",
  },
});

export const registerLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message:
      "Too many registration attempts. Please try again later.",
  },
});

export const forgotPasswordLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again later.",
  },
});

export const resetPasswordLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message:
      "Too many password reset attempts. Please try again later.",
  },
});

export const verifyEmailLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message:
      "Too many email verification attempts. Please try again later.",
  },
});

export const refreshTokenLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 60,
});