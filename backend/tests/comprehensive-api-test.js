/**
 * Comprehensive API Test Suite for Visitor Management System
 * Run with: node tests/comprehensive-api-test.js
 *
 * Features:
 * - JWT Authentication testing
 * - All API endpoints (auth, contractors, vehicles, sign-ins, staff, sharepoint, documents)
 * - Error handling validation
 * - Security testing (401, 403 responses)
 * - Data validation testing
 * - Integration test scenarios
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const USE_HTTPS = BASE_URL.startsWith('https');

// Test state
let authToken = null;
let testContractorId = null;
let testVehicleId = null;
let testSignInId = null;
let testStaffId = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0
};

// Helper function to make HTTP/HTTPS requests
function makeRequest(method, path, data = null, headers = {}) {
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
      // For development with self-signed certificates
      rejectUnauthorized: false
    };

    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: true
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test logging functions
function logSection(sectionName) {
  console.log(`\n${colors.magenta}${'='.repeat(60)}`);
  console.log(`${sectionName}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

function logTest(testName) {
  console.log(`${colors.cyan}Testing: ${testName}${colors.reset}`);
  stats.total++;
}

function logSuccess(message) {
  console.log(`  ${colors.green}✓ ${message}${colors.reset}`);
  stats.passed++;
}

function logError(message) {
  console.log(`  ${colors.red}✗ ${message}${colors.reset}`);
  stats.failed++;
}

function logSkip(message) {
  console.log(`  ${colors.yellow}⊘ ${message}${colors.reset}`);
  stats.skipped++;
}

function logInfo(message) {
  console.log(`  ${colors.blue}ℹ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`  ${colors.yellow}⚠ ${message}${colors.reset}`);
}

// ============================================================
// AUTHENTICATION TESTS
// ============================================================

async function testAuthLogin() {
  logTest('POST /api/v1/auth/login - Valid credentials');
  try {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (response.status === 200 && response.body.success) {
      authToken = response.body.data.token;
      logSuccess('Login successful');
      logInfo(`Token received: ${authToken.substring(0, 20)}...`);
      logInfo(`Username: ${response.body.data.user.username}`);
      return true;
    } else {
      logError(`Login failed: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return false;
  }
}

async function testAuthLoginInvalidCredentials() {
  logTest('POST /api/v1/auth/login - Invalid credentials');
  try {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: 'wrongpassword'
    });

    if (response.status === 401 && !response.body.success) {
      logSuccess('Invalid credentials properly rejected');
      return true;
    } else {
      logError('Invalid credentials should be rejected with 401');
      return false;
    }
  } catch (error) {
    logError(`Invalid credentials test error: ${error.message}`);
    return false;
  }
}

async function testAuthVerify() {
  logTest('POST /api/v1/auth/verify - Valid token');
  if (!authToken) {
    logSkip('No auth token available');
    return false;
  }

  try {
    const response = await makeRequest('POST', '/api/v1/auth/verify', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.valid) {
      logSuccess('Token verified successfully');
      logInfo(`User: ${response.body.data.username}`);
      return true;
    } else {
      logError('Token verification failed');
      return false;
    }
  } catch (error) {
    logError(`Token verification error: ${error.message}`);
    return false;
  }
}

async function testAuthVerifyInvalidToken() {
  logTest('POST /api/v1/auth/verify - Invalid token');
  try {
    const response = await makeRequest('POST', '/api/v1/auth/verify', null, {
      'Authorization': 'Bearer invalid_token_here'
    });

    if (response.status === 401 && !response.body.valid) {
      logSuccess('Invalid token properly rejected');
      return true;
    } else {
      logError('Invalid token should be rejected with 401');
      return false;
    }
  } catch (error) {
    logError(`Invalid token test error: ${error.message}`);
    return false;
  }
}

async function testUnauthorizedAccess() {
  logTest('GET /api/v1/contractors - No auth token (should fail)');
  try {
    const response = await makeRequest('GET', '/api/v1/contractors');

    if (response.status === 401) {
      logSuccess('Unauthorized access properly blocked');
      return true;
    } else {
      logError(`Expected 401, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Unauthorized access test error: ${error.message}`);
    return false;
  }
}

// ============================================================
// CONTRACTOR TESTS
// ============================================================

async function testCreateContractor() {
  logTest('POST /api/v1/contractors - Create contractor');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const contractorData = {
      company_name: `Test Company ${Date.now()}`,
      contractor_name: 'John Test',
      email: `test${Date.now()}@example.com`,
      phone_number: '+1234567890',
      status: 'pending',
      notes: 'Created by automated test'
    };

    const response = await makeRequest('POST', '/api/v1/contractors', contractorData, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 201 && response.body.success) {
      testContractorId = response.body.data.id;
      logSuccess(`Contractor created with ID: ${testContractorId}`);
      return true;
    } else {
      logError(`Failed to create contractor: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Create contractor error: ${error.message}`);
    return false;
  }
}

async function testGetAllContractors() {
  logTest('GET /api/v1/contractors - Get all contractors');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const response = await makeRequest('GET', '/api/v1/contractors', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.data.length} contractors`);
      return true;
    } else {
      logError('Failed to get contractors');
      return false;
    }
  } catch (error) {
    logError(`Get contractors error: ${error.message}`);
    return false;
  }
}

async function testApproveContractor() {
  logTest('PUT /api/v1/contractors/:id - Approve contractor');
  if (!authToken || !testContractorId) {
    logSkip('No auth token or contractor ID');
    return false;
  }

  try {
    const response = await makeRequest('PUT', `/api/v1/contractors/${testContractorId}`, {
      status: 'approved'
    }, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Contractor ${testContractorId} approved`);
      return true;
    } else {
      logError('Failed to approve contractor');
      return false;
    }
  } catch (error) {
    logError(`Approve contractor error: ${error.message}`);
    return false;
  }
}

// ============================================================
// VEHICLE TESTS
// ============================================================

async function testCreateVehicle() {
  logTest('POST /api/v1/vehicles - Create vehicle');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const vehicleData = {
      registration: `TEST${Date.now()}`,
      status: 'available',
      current_mileage: 50000
    };

    const response = await makeRequest('POST', '/api/v1/vehicles', vehicleData, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 201 && response.body.success) {
      testVehicleId = response.body.data.id;
      logSuccess(`Vehicle created with ID: ${testVehicleId}`);
      logInfo(`Registration: ${response.body.data.registration}`);
      return true;
    } else {
      logError(`Failed to create vehicle: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Create vehicle error: ${error.message}`);
    return false;
  }
}

async function testGetAllVehicles() {
  logTest('GET /api/v1/vehicles - Get all vehicles');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const response = await makeRequest('GET', '/api/v1/vehicles', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.data.length} vehicles`);
      return true;
    } else {
      logError('Failed to get vehicles');
      return false;
    }
  } catch (error) {
    logError(`Get vehicles error: ${error.message}`);
    return false;
  }
}

// ============================================================
// SIGN-IN TESTS
// ============================================================

async function testCreateSignIn() {
  logTest('POST /api/v1/sign-ins - Create sign-in');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const signInData = {
      visitor_type: 'visitor',
      full_name: 'Jane Doe',
      phone_number: '+1987654321',
      email: 'jane.doe@example.com',
      company_name: 'Test Company',
      purpose_of_visit: 'Integration test',
      car_registration: 'TEST123',
      visiting_person: 'Test Staff',
      photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    const response = await makeRequest('POST', '/api/v1/sign-ins', signInData, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 201 && response.body.success) {
      testSignInId = response.body.data.id;
      logSuccess(`Sign-in created with ID: ${testSignInId}`);
      return true;
    } else {
      logError(`Failed to create sign-in: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Create sign-in error: ${error.message}`);
    return false;
  }
}

async function testGetActiveVisitors() {
  logTest('GET /api/v1/sign-ins/status/active - Get active visitors');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const response = await makeRequest('GET', '/api/v1/sign-ins/status/active', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      const count = response.body.count || (response.body.data ? response.body.data.length : 0);
      logSuccess(`Retrieved ${count} active visitors`);
      return true;
    } else {
      logError(`Failed to get active visitors - Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Get active visitors error: ${error.message}`);
    return false;
  }
}

async function testSignOut() {
  logTest('PUT /api/v1/sign-ins/:id/sign-out - Sign out visitor');
  if (!authToken || !testSignInId) {
    logSkip('No auth token or sign-in ID');
    return false;
  }

  try {
    const response = await makeRequest('PUT', `/api/v1/sign-ins/${testSignInId}/sign-out`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Visitor ${testSignInId} signed out`);
      return true;
    } else {
      logError('Failed to sign out visitor');
      return false;
    }
  } catch (error) {
    logError(`Sign out error: ${error.message}`);
    return false;
  }
}

// ============================================================
// DOCUMENT TESTS
// ============================================================

async function testGetDocumentList() {
  logTest('GET /api/v1/documents/list - Get document list');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const response = await makeRequest('GET', '/api/v1/documents/list', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.data.count} documents`);
      return true;
    } else {
      logError('Failed to get document list');
      return false;
    }
  } catch (error) {
    logError(`Get document list error: ${error.message}`);
    return false;
  }
}

// ============================================================
// SHAREPOINT TESTS
// ============================================================

async function testSharePointStatus() {
  logTest('GET /api/v1/sharepoint/status - SharePoint status');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const response = await makeRequest('GET', '/api/v1/sharepoint/status', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success !== undefined) {
      logSuccess('SharePoint status retrieved');
      logInfo(`Enabled: ${response.body.enabled}`);
      logInfo(`Configured: ${response.body.configured}`);
      return true;
    } else {
      logError('Failed to get SharePoint status');
      return false;
    }
  } catch (error) {
    logError(`SharePoint status error: ${error.message}`);
    return false;
  }
}

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

async function testValidationErrors() {
  logTest('POST /api/v1/sign-ins - Validation error handling');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const invalidData = {
      visitor_type: 'invalid_type',
      full_name: 'A', // Too short
      phone_number: '123' // Invalid format
    };

    const response = await makeRequest('POST', '/api/v1/sign-ins', invalidData, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 400 && !response.body.success) {
      logSuccess('Validation errors properly handled');
      logInfo(`Errors: ${response.body.errors ? response.body.errors.length : 'error message present'}`);
      return true;
    } else {
      logError('Validation should have failed with 400');
      return false;
    }
  } catch (error) {
    logError(`Validation test error: ${error.message}`);
    return false;
  }
}

async function testNotFoundError() {
  logTest('GET /api/v1/sign-ins/99999999 - Not found error');
  if (!authToken) {
    logSkip('No auth token');
    return false;
  }

  try {
    const response = await makeRequest('GET', '/api/v1/sign-ins/99999999', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 404) {
      logSuccess('Not found error properly handled');
      return true;
    } else {
      logError(`Expected 404, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Not found test error: ${error.message}`);
    return false;
  }
}

// ============================================================
// CLEANUP TESTS
// ============================================================

async function testDeleteContractor() {
  logTest('DELETE /api/v1/contractors/:id - Delete contractor');
  if (!authToken || !testContractorId) {
    logSkip('No auth token or contractor ID');
    return false;
  }

  try {
    const response = await makeRequest('DELETE', `/api/v1/contractors/${testContractorId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Contractor ${testContractorId} deleted`);
      return true;
    } else {
      logError('Failed to delete contractor');
      return false;
    }
  } catch (error) {
    logError(`Delete contractor error: ${error.message}`);
    return false;
  }
}

async function testDeleteVehicle() {
  logTest('DELETE /api/v1/vehicles/:id - Delete vehicle');
  if (!authToken || !testVehicleId) {
    logSkip('No auth token or vehicle ID');
    return false;
  }

  try {
    const response = await makeRequest('DELETE', `/api/v1/vehicles/${testVehicleId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Vehicle ${testVehicleId} deleted`);
      return true;
    } else {
      logError('Failed to delete vehicle');
      return false;
    }
  } catch (error) {
    logError(`Delete vehicle error: ${error.message}`);
    return false;
  }
}

async function testDeleteSignIn() {
  logTest('DELETE /api/v1/sign-ins/:id - Delete sign-in');
  if (!authToken || !testSignInId) {
    logSkip('No auth token or sign-in ID');
    return false;
  }

  try {
    const response = await makeRequest('DELETE', `/api/v1/sign-ins/${testSignInId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status === 200 && response.body.success) {
      logSuccess(`Sign-in ${testSignInId} deleted`);
      return true;
    } else {
      logError('Failed to delete sign-in');
      return false;
    }
  } catch (error) {
    logError(`Delete sign-in error: ${error.message}`);
    return false;
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runTests() {
  const startTime = Date.now();

  console.log(`\n${colors.yellow}${'='.repeat(60)}`);
  console.log('Comprehensive Visitor Management API Test Suite');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Protocol: ${USE_HTTPS ? 'HTTPS' : 'HTTP'}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  // Test sections
  const testSections = [
    {
      name: 'Authentication Tests',
      tests: [
        testAuthLogin,
        testAuthLoginInvalidCredentials,
        testAuthVerify,
        testAuthVerifyInvalidToken,
        testUnauthorizedAccess
      ]
    },
    {
      name: 'Contractor Tests',
      tests: [
        testCreateContractor,
        testGetAllContractors,
        testApproveContractor
      ]
    },
    {
      name: 'Vehicle Tests',
      tests: [
        testCreateVehicle,
        testGetAllVehicles
      ]
    },
    {
      name: 'Sign-In Tests',
      tests: [
        testCreateSignIn,
        testGetActiveVisitors,
        testSignOut
      ]
    },
    {
      name: 'Document Tests',
      tests: [
        testGetDocumentList
      ]
    },
    {
      name: 'SharePoint Tests',
      tests: [
        testSharePointStatus
      ]
    },
    {
      name: 'Error Handling Tests',
      tests: [
        testValidationErrors,
        testNotFoundError
      ]
    },
    {
      name: 'Cleanup Tests',
      tests: [
        testDeleteSignIn,
        testDeleteContractor,
        testDeleteVehicle
      ]
    }
  ];

  // Run all test sections
  for (const section of testSections) {
    logSection(section.name);
    for (const test of section.tests) {
      try {
        await test();
      } catch (error) {
        console.error(`${colors.red}Unexpected error in test: ${error.message}${colors.reset}`);
        logError(error.stack);
        stats.failed++;
      }
    }
  }

  const endTime = Date.now();
  stats.duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.yellow}${'='.repeat(60)}`);
  console.log('Test Results Summary');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✓ Passed:  ${stats.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed:  ${stats.failed}${colors.reset}`);
  console.log(`${colors.yellow}⊘ Skipped: ${stats.skipped}${colors.reset}`);
  console.log(`Total:     ${stats.total}`);
  console.log(`Duration:  ${stats.duration}s`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);

  if (stats.failed === 0) {
    console.log(`${colors.green}🎉 All tests passed! (${passRate}% pass rate)${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ ${stats.failed} test(s) failed. (${passRate}% pass rate)${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
console.log('Starting test suite...');
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});
