/**
 * Stress Testing Suite for Visitor Management System
 * Run with: node tests/stress-test.js
 *
 * Features:
 * - Concurrent request testing
 * - Load testing (sustained traffic)
 * - Spike testing (sudden traffic bursts)
 * - Endurance testing (long-duration tests)
 * - Database connection pool stress testing
 * - Rate limiter testing
 * - Response time analysis
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const USE_HTTPS = BASE_URL.startsWith('https');

// Test configuration
const config = {
  // Number of concurrent users
  concurrentUsers: parseInt(process.env.STRESS_CONCURRENT || '50'),

  // Duration of sustained load test (seconds)
  loadTestDuration: parseInt(process.env.STRESS_DURATION || '30'),

  // Requests per second target
  targetRPS: parseInt(process.env.STRESS_RPS || '100'),

  // Spike test config
  spikeUsers: parseInt(process.env.STRESS_SPIKE || '200'),

  // Authentication (get from args or use defaults)
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123'
};

// Test statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  statusCodes: {},
  startTime: null,
  endTime: null
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

let authToken = null;

// Helper function to make HTTP/HTTPS requests
function makeRequest(method, path, data = null, headers = {}) {
  const startTime = Date.now();
  stats.totalRequests++;

  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const httpModule = USE_HTTPS ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      rejectUnauthorized: false
    };

    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        stats.responseTimes.push(responseTime);

        // Track status codes
        stats.statusCodes[res.statusCode] = (stats.statusCodes[res.statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }

        try {
          resolve({
            status: res.statusCode,
            responseTime,
            body: body ? JSON.parse(body) : null
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            responseTime,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      stats.failedRequests++;
      const errorKey = error.code || 'UNKNOWN';
      stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Authenticate and get token
async function authenticate() {
  console.log(`${colors.cyan}Authenticating...${colors.reset}`);
  try {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      username: config.username,
      password: config.password
    });

    if (response.status === 200 && response.body.success) {
      authToken = response.body.data.token;
      console.log(`${colors.green}✓ Authentication successful${colors.reset}\n`);
      return true;
    } else {
      console.log(`${colors.red}✗ Authentication failed${colors.reset}\n`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Authentication error: ${error.message}${colors.reset}\n`);
    return false;
  }
}

// Simulate a user session
async function simulateUserSession(userId) {
  const endpoints = [
    { method: 'GET', path: '/api/v1/sign-ins/status/active' },
    { method: 'GET', path: '/api/v1/contractors' },
    { method: 'GET', path: '/api/v1/vehicles' },
    { method: 'GET', path: '/api/v1/documents/list' }
  ];

  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  try {
    await makeRequest(randomEndpoint.method, randomEndpoint.path, null, {
      'Authorization': `Bearer ${authToken}`
    });
  } catch (error) {
    // Error already tracked in makeRequest
  }
}

// Test 1: Concurrent Users Test
async function testConcurrentUsers() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log(`TEST 1: Concurrent Users (${config.concurrentUsers} users)`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const promises = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    promises.push(simulateUserSession(i));
  }

  await Promise.all(promises);

  console.log(`${colors.green}✓ Concurrent users test completed${colors.reset}\n`);
}

// Test 2: Sustained Load Test
async function testSustainedLoad() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log(`TEST 2: Sustained Load (${config.loadTestDuration}s, ${config.targetRPS} RPS)`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const startTime = Date.now();
  const endTime = startTime + (config.loadTestDuration * 1000);
  const interval = 1000 / config.targetRPS; // milliseconds between requests

  let requestCount = 0;

  while (Date.now() < endTime) {
    const batchStart = Date.now();
    simulateUserSession(requestCount++).catch(() => {});

    const elapsed = Date.now() - batchStart;
    const delay = Math.max(0, interval - elapsed);

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Wait for remaining requests to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`${colors.green}✓ Sustained load test completed${colors.reset}\n`);
}

// Test 3: Spike Test
async function testSpike() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log(`TEST 3: Spike Test (${config.spikeUsers} sudden requests)`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const promises = [];
  for (let i = 0; i < config.spikeUsers; i++) {
    promises.push(simulateUserSession(i));
  }

  await Promise.all(promises);

  console.log(`${colors.green}✓ Spike test completed${colors.reset}\n`);
}

// Test 4: Rate Limiter Test
async function testRateLimiter() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log(`TEST 4: Rate Limiter (100 rapid requests)`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  let rateLimited = 0;
  const promises = [];

  for (let i = 0; i < 100; i++) {
    promises.push(
      makeRequest('GET', '/api/v1/sign-ins/status/active', null, {
        'Authorization': `Bearer ${authToken}`
      }).then(response => {
        if (response.status === 429) {
          rateLimited++;
        }
      }).catch(() => {})
    );
  }

  await Promise.all(promises);

  console.log(`${colors.blue}ℹ Rate limited requests: ${rateLimited}${colors.reset}`);
  console.log(`${colors.green}✓ Rate limiter test completed${colors.reset}\n`);
}

// Test 5: Database Connection Pool Test
async function testDatabasePool() {
  console.log(`${colors.magenta}${'='.repeat(60)}`);
  console.log(`TEST 5: Database Pool (50 concurrent DB queries)`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const promises = [];

  // These endpoints hit the database
  for (let i = 0; i < 50; i++) {
    promises.push(
      makeRequest('GET', '/api/v1/sign-ins?limit=10', null, {
        'Authorization': `Bearer ${authToken}`
      }).catch(() => {})
    );
  }

  await Promise.all(promises);

  console.log(`${colors.green}✓ Database pool test completed${colors.reset}\n`);
}

// Calculate statistics
function calculateStats() {
  if (stats.responseTimes.length === 0) return;

  const sorted = stats.responseTimes.sort((a, b) => a - b);
  const total = sorted.reduce((sum, time) => sum + time, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: (total / sorted.length).toFixed(2),
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

// Print test results
function printResults() {
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  const rps = (stats.totalRequests / duration).toFixed(2);
  const responseStats = calculateStats();

  console.log(`${colors.yellow}${'='.repeat(60)}`);
  console.log('Stress Test Results');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  console.log(`${colors.cyan}Overall Performance:${colors.reset}`);
  console.log(`  Total Requests:      ${stats.totalRequests}`);
  console.log(`  Successful:          ${colors.green}${stats.successfulRequests}${colors.reset} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Failed:              ${colors.red}${stats.failedRequests}${colors.reset} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Duration:            ${duration}s`);
  console.log(`  Requests/Second:     ${rps}\n`);

  if (responseStats) {
    console.log(`${colors.cyan}Response Times (ms):${colors.reset}`);
    console.log(`  Min:                 ${responseStats.min}ms`);
    console.log(`  Max:                 ${responseStats.max}ms`);
    console.log(`  Average:             ${responseStats.avg}ms`);
    console.log(`  Median:              ${responseStats.median}ms`);
    console.log(`  95th Percentile:     ${responseStats.p95}ms`);
    console.log(`  99th Percentile:     ${responseStats.p99}ms\n`);
  }

  console.log(`${colors.cyan}HTTP Status Codes:${colors.reset}`);
  Object.entries(stats.statusCodes).sort().forEach(([code, count]) => {
    const color = code.startsWith('2') ? colors.green : code.startsWith('4') || code.startsWith('5') ? colors.red : colors.yellow;
    console.log(`  ${color}${code}${colors.reset}: ${count}`);
  });

  if (Object.keys(stats.errors).length > 0) {
    console.log(`\n${colors.cyan}Errors:${colors.reset}`);
    Object.entries(stats.errors).forEach(([error, count]) => {
      console.log(`  ${colors.red}${error}${colors.reset}: ${count}`);
    });
  }

  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  // Evaluation
  const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
  const avgResponseTime = parseFloat(responseStats?.avg || 0);

  if (successRate >= 99 && avgResponseTime < 500) {
    console.log(`${colors.green}🎉 EXCELLENT: System handles load very well!${colors.reset}\n`);
  } else if (successRate >= 95 && avgResponseTime < 1000) {
    console.log(`${colors.green}✓ GOOD: System performs adequately under load${colors.reset}\n`);
  } else if (successRate >= 90) {
    console.log(`${colors.yellow}⚠ WARNING: System shows some strain under load${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ CRITICAL: System struggles under load - optimization needed!${colors.reset}\n`);
  }
}

// Main test runner
async function runStressTests() {
  console.log(`\n${colors.yellow}${'='.repeat(60)}`);
  console.log('Visitor Management API - Stress Testing Suite');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  console.log(`Target:              ${BASE_URL}`);
  console.log(`Concurrent Users:    ${config.concurrentUsers}`);
  console.log(`Load Test Duration:  ${config.loadTestDuration}s`);
  console.log(`Target RPS:          ${config.targetRPS}`);
  console.log(`Spike Users:         ${config.spikeUsers}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  // Authenticate first
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log(`${colors.red}Cannot proceed without authentication${colors.reset}\n`);
    process.exit(1);
  }

  stats.startTime = Date.now();

  try {
    // Run all stress tests
    await testConcurrentUsers();
    await testSustainedLoad();
    await testSpike();
    await testRateLimiter();
    await testDatabasePool();

    stats.endTime = Date.now();

    // Print results
    printResults();

    // Exit with appropriate code
    const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    process.exit(successRate >= 95 ? 0 : 1);

  } catch (error) {
    console.error(`${colors.red}Fatal error during stress testing: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Stress Testing Suite for Visitor Management System

Usage: node tests/stress-test.js [options]

Environment Variables:
  STRESS_CONCURRENT  Number of concurrent users (default: 50)
  STRESS_DURATION    Load test duration in seconds (default: 30)
  STRESS_RPS         Target requests per second (default: 100)
  STRESS_SPIKE       Number of users for spike test (default: 200)
  TEST_USERNAME      Admin username (default: admin)
  TEST_PASSWORD      Admin password (default: admin123)
  API_BASE_URL       API base URL (default: http://localhost:3000)

Examples:
  # Default stress test
  node tests/stress-test.js

  # Custom configuration
  STRESS_CONCURRENT=100 STRESS_DURATION=60 node tests/stress-test.js

  # Test against production (use with caution!)
  API_BASE_URL=https://api.production.com node tests/stress-test.js
  `);
  process.exit(0);
}

// Run the stress tests
console.log('Starting stress test suite...');
runStressTests();
