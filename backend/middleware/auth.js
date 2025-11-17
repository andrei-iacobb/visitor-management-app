const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication token is required'
        }
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('Invalid token attempt', {
          ip: req.ip,
          path: req.path,
          error: err.message
        });

        // Different error messages for different token issues
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token has expired',
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Please login again'
            }
          });
        }

        return res.status(403).json({
          success: false,
          message: 'Invalid token',
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token is invalid or malformed'
          }
        });
      }

      // Attach user info to request
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: {
        code: 'AUTH_ERROR',
        message: 'Internal authentication error'
      }
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user if valid token is present
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token, but that's okay for optional auth
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

/**
 * Role-based authentication middleware
 * Requires specific role(s) to access endpoint
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'NO_AUTH',
          message: 'You must be logged in to access this resource'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        user: req.user.username,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};
