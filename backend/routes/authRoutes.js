const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/v1/auth/login
 * Admin login endpoint
 * Validates credentials and returns JWT token
 */
router.post('/login',
  authLimiter, // Apply rate limiting
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;

      // Get admin credentials from environment
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

      // Check if admin password is configured
      if (!adminPasswordHash) {
        logger.error('Admin password not configured in environment');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error',
          error: {
            code: 'CONFIG_ERROR',
            message: 'Admin authentication not properly configured'
          }
        });
      }

      // Verify username
      if (username !== adminUsername) {
        logger.warn('Failed login attempt - invalid username', {
          attemptedUsername: username,
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Username or password is incorrect'
          }
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
      if (!passwordMatch) {
        logger.warn('Failed login attempt - invalid password', {
          username,
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Username or password is incorrect'
          }
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          username,
          role: 'admin',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRY || '24h' // Token expires in 24 hours by default
        }
      );

      logger.info('Successful admin login', {
        username,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          expiresIn: process.env.JWT_EXPIRY || '24h',
          user: {
            username,
            role: 'admin'
          }
        }
      });
    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during login'
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/verify
 * Verify JWT token validity
 */
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        valid: false
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          valid: false,
          error: {
            code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
            message: err.message
          }
        });
      }

      res.json({
        success: true,
        message: 'Token is valid',
        valid: true,
        data: {
          username: user.username,
          role: user.role,
          iat: user.iat,
          exp: user.exp
        }
      });
    });
  } catch (error) {
    logger.error('Token verification error', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      valid: false
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token (extend expiration)
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify old token (even if expired, we'll refresh it)
    jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, (err, user) => {
      if (err && err.name !== 'TokenExpiredError') {
        return res.status(403).json({
          success: false,
          message: 'Invalid token',
          error: {
            code: 'INVALID_TOKEN',
            message: 'Cannot refresh invalid token'
          }
        });
      }

      // Generate new token
      const newToken = jwt.sign(
        {
          username: user.username,
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRY || '24h'
        }
      );

      logger.info('Token refreshed', {
        username: user.username
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          expiresIn: process.env.JWT_EXPIRY || '24h'
        }
      });
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
