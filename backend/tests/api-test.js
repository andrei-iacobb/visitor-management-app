/**
 * API Test Script for Visitor Management System
 * Run with: npm test
 *
 * This script tests all API endpoints to ensure they're working correctly.
 * Make sure the server is running before executing this test.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let testSignInId = null;
let testStaffId = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
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
            body: body
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
function logTest(testName) {
  console.log(`\n${colors.cyan}Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`  ${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`  ${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`  ${colors.blue}ℹ ${message}${colors.reset}`);
}

// Test functions
async function testHealthCheck() {
  logTest('Health Check');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200 && response.body.success) {
      logSuccess('Server is healthy');
      return true;
    } else {
      logError('Health check failed');
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error.message}`);
    return false;
  }
}

async function testCreateStaff() {
  logTest('Create Staff Member');
  try {
    const staffData = {
      name: 'Test Staff Member',
      email: `test${Date.now()}@example.com`,
      department: 'Testing'
    };

    const response = await makeRequest('POST', '/api/staff', staffData);
    if (response.status === 201 && response.body.success) {
      testStaffId = response.body.data.id;
      logSuccess(`Staff member created with ID: ${testStaffId}`);
      return true;
    } else {
      logError(`Failed to create staff: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Create staff error: ${error.message}`);
    return false;
  }
}

async function testGetAllStaff() {
  logTest('Get All Staff Members');
  try {
    const response = await makeRequest('GET', '/api/staff');
    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.count} staff members`);
      return true;
    } else {
      logError('Failed to get staff members');
      return false;
    }
  } catch (error) {
    logError(`Get staff error: ${error.message}`);
    return false;
  }
}

async function testCreateSignIn() {
  logTest('Create Sign-In');
  try {
    const signInData = {
      visitor_type: 'visitor',
      full_name: 'John Doe',
      phone_number: '+1234567890',
      email: 'john.doe@example.com',
      company_name: 'Test Company',
      purpose_of_visit: 'Business meeting',
      car_registration: 'ABC123',
      visiting_person: 'Test Staff Member',
      photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    const response = await makeRequest('POST', '/api/sign-ins', signInData);
    if (response.status === 201 && response.body.success) {
      testSignInId = response.body.data.id;
      logSuccess(`Sign-in created with ID: ${testSignInId}`);
      logInfo(`Sign-in time: ${response.body.data.sign_in_time}`);
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

async function testGetAllSignIns() {
  logTest('Get All Sign-Ins');
  try {
    const response = await makeRequest('GET', '/api/sign-ins?limit=10');
    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.data.length} sign-ins`);
      logInfo(`Total records: ${response.body.pagination.total}`);
      return true;
    } else {
      logError('Failed to get sign-ins');
      return false;
    }
  } catch (error) {
    logError(`Get sign-ins error: ${error.message}`);
    return false;
  }
}

async function testGetActiveVisitors() {
  logTest('Get Active Visitors');
  try {
    const response = await makeRequest('GET', '/api/sign-ins/status/active');
    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.count} active visitors`);
      return true;
    } else {
      logError('Failed to get active visitors');
      return false;
    }
  } catch (error) {
    logError(`Get active visitors error: ${error.message}`);
    return false;
  }
}

async function testGetSingleSignIn() {
  logTest('Get Single Sign-In');
  if (!testSignInId) {
    logError('No test sign-in ID available');
    return false;
  }

  try {
    const response = await makeRequest('GET', `/api/sign-ins/${testSignInId}`);
    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved sign-in ${testSignInId}`);
      logInfo(`Visitor: ${response.body.data.full_name}`);
      return true;
    } else {
      logError('Failed to get sign-in');
      return false;
    }
  } catch (error) {
    logError(`Get sign-in error: ${error.message}`);
    return false;
  }
}

async function testFilteredSignIns() {
  logTest('Get Filtered Sign-Ins (Visitors Only)');
  try {
    const response = await makeRequest('GET', '/api/sign-ins?visitor_type=visitor&limit=5');
    if (response.status === 200 && response.body.success) {
      logSuccess(`Retrieved ${response.body.data.length} visitor records`);
      return true;
    } else {
      logError('Failed to get filtered sign-ins');
      return false;
    }
  } catch (error) {
    logError(`Get filtered sign-ins error: ${error.message}`);
    return false;
  }
}

async function testSignOut() {
  logTest('Sign Out Visitor');
  if (!testSignInId) {
    logError('No test sign-in ID available');
    return false;
  }

  try {
    const response = await makeRequest('PUT', `/api/sign-ins/${testSignInId}/sign-out`);
    if (response.status === 200 && response.body.success) {
      logSuccess(`Visitor ${testSignInId} signed out successfully`);
      logInfo(`Sign-out time: ${response.body.data.sign_out_time}`);
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

async function testSharePointStatus() {
  logTest('SharePoint Integration Status');
  try {
    const response = await makeRequest('GET', '/api/sharepoint/status');
    if (response.status === 200 && response.body.success) {
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

async function testValidationErrors() {
  logTest('Validation Error Handling');
  try {
    // Try to create sign-in with invalid data
    const invalidData = {
      visitor_type: 'invalid_type',
      full_name: 'A', // Too short
      phone_number: '123'
    };

    const response = await makeRequest('POST', '/api/sign-ins', invalidData);
    if (response.status === 400 && !response.body.success) {
      logSuccess('Validation errors properly handled');
      logInfo(`Errors caught: ${response.body.errors.length}`);
      return true;
    } else {
      logError('Validation should have failed');
      return false;
    }
  } catch (error) {
    logError(`Validation test error: ${error.message}`);
    return false;
  }
}

async function testDeleteSignIn() {
  logTest('Delete Sign-In');
  if (!testSignInId) {
    logError('No test sign-in ID available');
    return false;
  }

  try {
    const response = await makeRequest('DELETE', `/api/sign-ins/${testSignInId}`);
    if (response.status === 200 && response.body.success) {
      logSuccess(`Sign-in ${testSignInId} deleted successfully`);
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

// Main test runner
async function runTests() {
  console.log(`\n${colors.yellow}========================================`);
  console.log('Visitor Management API Test Suite');
  console.log(`========================================${colors.reset}\n`);

  const tests = [
    testHealthCheck,
    testCreateStaff,
    testGetAllStaff,
    testCreateSignIn,
    testGetAllSignIns,
    testGetActiveVisitors,
    testGetSingleSignIn,
    testFilteredSignIns,
    testSignOut,
    testSharePointStatus,
    testValidationErrors,
    testDeleteSignIn
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`${colors.red}Unexpected error in test: ${error.message}${colors.reset}`);
      failed++;
    }
  }

  console.log(`\n${colors.yellow}========================================`);
  console.log('Test Results');
  console.log(`========================================${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${passed + failed}\n`);

  if (failed === 0) {
    console.log(`${colors.green}All tests passed! ✓${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}Some tests failed. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
