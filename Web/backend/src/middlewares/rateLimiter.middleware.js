import rateLimit from 'express-rate-limit';
import ApiError from '../utils/apiError.js';

// Standard API limiter: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many requests from this IP, please try again in 15 minutes'));
  }
});

// Sensitive Auth limiter: 10 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many login attempts. Please wait 15 minutes.'));
  }
});

// Pull trigger limiter: Protects mobile battery and cellular radio
// Maximum 1 pull trigger per 15 seconds per target device
export const pullTriggerLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: 1,
  keyGenerator: (req) => req.body?.deviceId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('A pull request is already in progress for this device. Please wait 15 seconds.'));
  }
});
