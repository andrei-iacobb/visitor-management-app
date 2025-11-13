const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool configuration
// TODO: PRODUCTION - Adjust pool settings for containerized environment:
// TODO: PRODUCTION - Reduce 'max' from 20 to 10-15 for containerized backends (memory constraints)
// TODO: PRODUCTION - Increase idleTimeoutMillis to 60000ms for Kubernetes environments with frequent restarts
// TODO: PRODUCTION - Use database service DNS (e.g., db-service.default.svc.cluster.local) instead of localhost
// TODO: PRODUCTION - Enable SSL for database connections (require_ssl: true, ssl: {rejectUnauthorized: false})
// TODO: PRODUCTION - Add connection retry logic for orchestration platform health checks
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'visitor_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Event handlers for pool
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('📊 Database connection test successful:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Helper function to execute queries with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};
