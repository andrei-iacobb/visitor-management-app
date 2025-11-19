const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const { spawn } = require('child_process');
require('dotenv').config();

const logger = require('./utils/logger');
const { testConnection, pool, closePool } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const signInRoutes = require('./routes/signInRoutes');
const staffRoutes = require('./routes/staffRoutes');
const sharepointRoutes = require('./routes/sharepointRoutes');
const contractorValidationRoutes = require('./routes/contractorValidationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// Middleware Configuration
// ========================================

// Request ID middleware - Add unique ID to each request for tracking
app.use((req, res, next) => {
  req.id = uuidv4();
  req.requestTime = new Date().toISOString();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// HTTP Request logging with Winston
const morgan = require('morgan');
morgan.token('id', (req) => req.id);
app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms', {
  stream: logger.stream
}));

// Compression middleware
app.use(compression());

// Security headers - Configure CSP for admin dashboard
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    }
  }
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public', {
  maxAge: 0,
  etag: false,
  lastModified: false
}));
app.use(express.static(path.join(__dirname, '../web'), {
  maxAge: 0,
  etag: false,
  lastModified: false
}));

// Cache control for all routes (static files and API)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ========================================
// Public Routes (No Authentication Required)
// ========================================

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    success: true,
    message: 'Visitor Management API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'unknown'
  };

  try {
    // Check database connectivity
    await pool.query('SELECT 1');
    health.database = 'connected';
    res.json(health);
  } catch (error) {
    health.database = 'disconnected';
    health.success = false;
    logger.error('Health check failed - database disconnected', { error: error.message });
    res.status(503).json(health);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Visitor Management API',
    version: '2.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// ========================================
// API Routes v1
// ========================================

// Authentication routes (public - no JWT required, but certificate required if mTLS enabled)
app.use('/api/v1/auth', authRoutes);

// Apply rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// Protected routes - Require JWT authentication
app.use('/api/v1/sign-ins', authenticateToken, signInRoutes);
app.use('/api/v1/staff', authenticateToken, staffRoutes);
app.use('/api/v1/sharepoint', authenticateToken, sharepointRoutes);
app.use('/api/v1/contractors', authenticateToken, contractorValidationRoutes);
app.use('/api/v1/documents', authenticateToken, documentRoutes);
app.use('/api/v1/vehicles', authenticateToken, vehicleRoutes);

// Legacy routes (backwards compatibility - will be deprecated)
// TODO: Remove these after Android app is updated to use /api/v1
logger.warn('Legacy API routes are enabled. Update clients to use /api/v1/* endpoints.');
app.use('/api/sign-ins', authenticateToken, signInRoutes);
app.use('/api/staff', authenticateToken, staffRoutes);
app.use('/api/sharepoint', authenticateToken, sharepointRoutes);
app.use('/api/contractors', authenticateToken, contractorValidationRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/vehicles', authenticateToken, vehicleRoutes);

// ========================================
// Error Handling Middleware
// ========================================

// 404 handler - Route not found
app.use((req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    requestId: req.id
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'NOT_FOUND',
      path: req.path,
      method: req.method
    },
    requestId: req.id
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id
  });

  // Check for specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
      requestId: req.id
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      error: {
        code: 'DUPLICATE_ENTRY',
        detail: err.detail
      },
      requestId: req.id
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        detail: err.detail
      },
      requestId: req.id
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: {
      code: 'SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    requestId: req.id
  });
});

// ========================================
// Server Initialization
// ========================================

const startServer = async () => {
  try {
    // Validate environment variables
    logger.info('Validating environment configuration...');
    const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      logger.error('Missing required environment variables', { missing: missingVars });
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Warn if JWT_SECRET is too short
    if (process.env.JWT_SECRET.length < 32) {
      logger.warn('JWT_SECRET is shorter than recommended 32 characters. Please use a longer secret in production.');
    }

    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database');
      throw new Error('Database connection failed');
    }

    // Check if mTLS is enabled
    const enableMTLS = process.env.ENABLE_MTLS === 'true';
    let server;

    if (enableMTLS) {
      logger.info('mTLS enabled - Starting HTTPS server with client certificate authentication');

      // Load certificates
      const certPath = process.env.CERT_PATH || './certs/server-cert.pem';
      const keyPath = process.env.KEY_PATH || './certs/server-key.pem';
      const caPath = process.env.CA_PATH || './certs/ca-cert.pem';

      // Check if certificate files exist
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath) || !fs.existsSync(caPath)) {
        logger.error('Certificate files not found', { certPath, keyPath, caPath });
        throw new Error('Certificate files not found. Run: cd scripts && ./generate-certs.sh');
      }

      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        ca: fs.readFileSync(caPath),
        requestCert: true,        // Request client certificate
        rejectUnauthorized: false  // Don't reject immediately - we'll validate in middleware
      };

      // Certificate validation middleware (only for mTLS)
      app.use((req, res, next) => {
        // Skip certificate check for health endpoint
        if (req.path === '/health') {
          return next();
        }

        const cert = req.socket.getPeerCertificate();

        if (!req.client.authorized) {
          logger.warn('Unauthorized certificate attempt', {
            ip: req.ip,
            path: req.path,
            error: req.socket.authorizationError
          });
          return res.status(401).json({
            success: false,
            message: 'Invalid client certificate',
            error: {
              code: 'INVALID_CERTIFICATE',
              detail: req.socket.authorizationError
            }
          });
        }

        logger.debug('Client certificate validated', {
          subject: cert.subject,
          issuer: cert.issuer
        });
        next();
      });

      server = https.createServer(httpsOptions, app);
      logger.info('HTTPS server created with mTLS');
    } else {
      logger.warn('mTLS disabled - Starting HTTP server (NOT RECOMMENDED FOR PRODUCTION)');
      server = http.createServer(app);
    }

    // Start server
    global.server = server.listen(PORT, '0.0.0.0', () => {
      logger.info('========================================');
      logger.info('🚀 Visitor Management API Server');
      logger.info('========================================');
      logger.info(`🌐 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 Protocol: ${enableMTLS ? 'HTTPS (mTLS)' : 'HTTP'}`);
      logger.info(`🔑 JWT Authentication: ENABLED`);
      logger.info(`⏱️  Request ID tracking: ENABLED`);
      logger.info(`📝 Logging level: ${process.env.LOG_LEVEL || 'info'}`);
      logger.info(`🛡️  Rate limiting: ENABLED`);
      logger.info(`📦 Compression: ENABLED`);
      logger.info('========================================');
      logger.info('✅ Server started successfully');
      logger.info('========================================');

      // ========================================
      // Scheduled Data Archival Job
      // ========================================

      // Schedule automated data archival (configurable via environment variables)
      if (process.env.ENABLE_DATA_ARCHIVAL !== 'false') {
        const archivalSchedule = process.env.ARCHIVAL_CRON_SCHEDULE || '0 2 1 * *'; // Default: 1st of each month at 2 AM
        const retentionDays = process.env.ARCHIVAL_RETENTION_DAYS || '90';

        cron.schedule(archivalSchedule, () => {
          logger.info('Starting scheduled data archival job...', {
            retentionDays,
            schedule: archivalSchedule
          });

          const archivalProcess = spawn('node', [
            path.join(__dirname, 'scripts', 'archive-old-records.js'),
            `--retention-days=${retentionDays}`
          ]);

          archivalProcess.stdout.on('data', (data) => {
            logger.info('Archival output', { message: data.toString().trim() });
          });

          archivalProcess.stderr.on('data', (data) => {
            logger.error('Archival error output', { message: data.toString().trim() });
          });

          archivalProcess.on('close', (code) => {
            if (code === 0) {
              logger.info('Scheduled archival completed successfully', { exitCode: code });
            } else {
              logger.error('Scheduled archival failed', { exitCode: code });
            }
          });

          archivalProcess.on('error', (error) => {
            logger.error('Failed to spawn archival process', {
              error: error.message,
              stack: error.stack
            });
          });
        });

        logger.info('📅 Data archival scheduled', {
          schedule: archivalSchedule,
          retentionDays: `${retentionDays} days`,
          enabled: true
        });
      } else {
        logger.info('📅 Data archival: DISABLED');
      }
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// ========================================
// Graceful Shutdown
// ========================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: initiating graceful shutdown`);

  if (global.server) {
    // Stop accepting new connections
    global.server.close(async () => {
      logger.info('HTTP server closed - no longer accepting connections');

      try {
        // Close database pool
        await closePool();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', {
          error: error.message,
          stack: error.stack
        });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 30000);
  } else {
    logger.info('No active server to close');
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason,
    promise: promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
startServer();

module.exports = app;
