const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded. Please wait before making more requests.'
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: req.rateLimit.resetTime
      }
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 * Prevents brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many failed login attempts. Please try again in 15 minutes.'
    }
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      attempts: req.rateLimit.current,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later',
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many failed login attempts. Account temporarily locked.',
        retryAfter: req.rateLimit.resetTime
      }
    });
  },
});

/**
 * Strict rate limiter for sign-in creation
 * 20 sign-ins per hour per IP
 * Prevents abuse of visitor sign-in system
 */
const signInLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 sign-ins per hour
  message: {
    success: false,
    message: 'Too many sign-in attempts, please contact administrator',
    error: {
      code: 'SIGN_IN_RATE_LIMIT_EXCEEDED',
      message: 'Too many sign-in attempts from this location. Please contact the administrator if this is an error.'
    }
  },
  handler: (req, res) => {
    logger.warn('Sign-in rate limit exceeded', {
      ip: req.ip,
      visitorName: req.body?.full_name,
      company: req.body?.company_name,
      attempts: req.rateLimit.current
    });
    res.status(429).json({
      success: false,
      message: 'Too many sign-in attempts, please contact administrator',
      error: {
        code: 'SIGN_IN_RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for sign-ins. Please wait before trying again.',
        retryAfter: req.rateLimit.resetTime
      }
    });
  },
});

/**
 * Contractor validation rate limiter
 * 30 requests per 5 minutes per IP
 * Allows frequent checks during sign-in process
 */
const contractorValidationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 validation requests per 5 minutes
  message: {
    success: false,
    message: 'Too many validation requests, please slow down',
    error: {
      code: 'VALIDATION_RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded for contractor validation.'
    }
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  signInLimiter,
  contractorValidationLimiter
};
