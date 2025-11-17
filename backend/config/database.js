const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

// Database connection pool configuration
// TODO: PRODUCTION - Enable SSL for database connections (ssl: { rejectUnauthorized: false })
// TODO: PRODUCTION - Consider increasing connectionTimeoutMillis for slower networks (currently 5000ms)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'visitor_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Increased from 2s for production stability
  // SSL configuration (enable in production)
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Connection pool monitoring
let totalConnections = 0;
let failedConnections = 0;

// Event handlers for pool
pool.on('connect', (client) => {
  totalConnections++;
  logger.info('Database client connected', {
    totalConnections,
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool', {
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  logger.info('Client removed from pool', {
    poolSize: pool.totalCount,
    idleCount: pool.idleCount
  });
});

pool.on('error', (err, client) => {
  failedConnections++;
  logger.error('Unexpected database pool error', {
    error: err.message,
    code: err.code,
    stack: err.stack,
    failedConnections,
    poolSize: pool.totalCount,
    idleCount: pool.idleCount
  });
  // DO NOT call process.exit() - let the application handle the error
  // The pool will attempt to recover automatically
});

// Connection retry logic
const connectWithRetry = async (maxRetries = 5, retryDelay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      logger.info('Database connection test successful', {
        timestamp: result.rows[0].now,
        attempt,
        poolSize: pool.totalCount
      });
      client.release();
      return true;
    } catch (error) {
      logger.error('Database connection test failed', {
        attempt,
        maxRetries,
        error: error.message,
        code: error.code
      });

      if (attempt < maxRetries) {
        logger.warn(`Retrying database connection in ${retryDelay}ms...`, { attempt, maxRetries });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Exponential backoff
        retryDelay *= 2;
      } else {
        logger.error('Database connection failed after maximum retry attempts', {
          maxRetries,
          error: error.message
        });
        return false;
      }
    }
  }
  return false;
};

// Test database connection (for backward compatibility)
const testConnection = async () => {
  return connectWithRetry(3, 1000);
};

// Helper function to execute queries with error handling and logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Query executed successfully', {
      query: text.substring(0, 100), // Log first 100 chars
      duration,
      rows: res.rowCount,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount
    });

    return res;
  } catch (error) {
    const duration = Date.now() - start;

    logger.error('Query execution failed', {
      query: text.substring(0, 100),
      duration,
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount
    });

    throw error;
  }
};

// Transaction helper with improved error handling and logging
const transaction = async (callback) => {
  const client = await pool.connect();
  const transactionId = Date.now();

  try {
    logger.debug('Transaction started', { transactionId });
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed', { transactionId });

    return result;
  } catch (error) {
    await client.query('ROLLBACK');

    logger.error('Transaction rolled back', {
      transactionId,
      error: error.message,
      code: error.code,
      detail: error.detail
    });

    throw error;
  } finally {
    client.release();
    logger.debug('Transaction client released', { transactionId });
  }
};

// Get pool statistics (for monitoring)
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    totalConnections,
    failedConnections
  };
};

// Log pool statistics periodically (every 5 minutes)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = getPoolStats();
    logger.info('Database pool statistics', stats);

    // Warn if pool is exhausted
    if (stats.waitingCount > 0) {
      logger.warn('Database pool has waiting clients - consider increasing pool size', stats);
    }

    // Warn if too many connections are idle
    if (stats.idleCount > stats.totalCount * 0.8) {
      logger.warn('High number of idle connections in pool', stats);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Graceful shutdown
const closePool = async () => {
  try {
    logger.info('Closing database connection pool...');
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  connectWithRetry,
  getPoolStats,
  closePool
};
