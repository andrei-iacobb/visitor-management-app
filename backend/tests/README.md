# API Testing Suite

Comprehensive testing suite for the Visitor Management System API.

## Test Files

### 1. `api-test.js` - Basic API Tests
**Original test suite** covering core functionality.

```bash
npm test
```

**Features:**
- Health check
- Sign-in CRUD operations
- Staff member operations
- Active visitors
- SharePoint status
- Basic validation

### 2. `comprehensive-api-test.js` - Full API Coverage
**Enhanced test suite** with JWT authentication and complete endpoint coverage.

```bash
npm run test:comprehensive
```

**Features:**
- ✅ **JWT Authentication Testing**
  - Login with valid/invalid credentials
  - Token verification
  - Token expiration handling
  - Unauthorized access prevention

- ✅ **Contractor API Testing**
  - Create, read, update, delete
  - Approve/deny workflow
  - Validation errors

- ✅ **Vehicle API Testing**
  - Vehicle registration
  - Status management
  - Mileage tracking

- ✅ **Sign-In API Testing**
  - Visitor sign-in/sign-out
  - Active visitors list
  - Filtering and pagination

- ✅ **Document API Testing**
  - Document list retrieval
  - PDF access

- ✅ **SharePoint Integration Testing**
  - Status checks
  - Configuration validation

- ✅ **Error Handling Testing**
  - Validation errors (400)
  - Not found errors (404)
  - Unauthorized errors (401)
  - Rate limiting (429)

**Test Statistics:**
- Total tests: 25+
- Coverage: All major endpoints
- Authentication: JWT Bearer tokens
- Cleanup: Automatic test data cleanup

### 3. `stress-test.js` - Load & Performance Testing
**Performance testing suite** for production readiness assessment.

```bash
npm run test:stress
```

**Test Scenarios:**

1. **Concurrent Users Test**
   - Simulates N users accessing the API simultaneously
   - Default: 50 concurrent users
   - Tests: Concurrent request handling

2. **Sustained Load Test**
   - Continuous traffic for X seconds
   - Default: 30 seconds at 100 RPS
   - Tests: System stability under sustained load

3. **Spike Test**
   - Sudden burst of requests
   - Default: 200 simultaneous requests
   - Tests: System resilience to traffic spikes

4. **Rate Limiter Test**
   - 100 rapid requests to test rate limiting
   - Tests: Rate limiter effectiveness

5. **Database Connection Pool Test**
   - 50 concurrent database queries
   - Tests: Connection pool handling

**Metrics Reported:**
- Total requests
- Success/failure rates
- Response times (min, max, avg, median, p95, p99)
- Requests per second (RPS)
- HTTP status code distribution
- Error types and counts

**Configuration:**
```bash
# Custom concurrent users
STRESS_CONCURRENT=100 npm run test:stress

# Custom load test duration (seconds)
STRESS_DURATION=60 npm run test:stress

# Custom target RPS
STRESS_RPS=200 npm run test:stress

# Custom spike size
STRESS_SPIKE=500 npm run test:stress

# Combined configuration
STRESS_CONCURRENT=100 STRESS_DURATION=60 STRESS_RPS=200 npm run test:stress
```

**Performance Benchmarks:**

| Rating | Success Rate | Avg Response Time |
|--------|--------------|-------------------|
| 🎉 Excellent | ≥99% | <500ms |
| ✓ Good | ≥95% | <1000ms |
| ⚠ Warning | ≥90% | <2000ms |
| ❌ Critical | <90% | >2000ms |

---

## Running All Tests

```bash
# Run basic + comprehensive tests
npm run test:all

# Run all tests including stress test (use with caution in production!)
npm test && npm run test:comprehensive && npm run test:stress
```

---

## Prerequisites

1. **Server must be running:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

2. **Database must be configured:**
   - PostgreSQL running
   - Schema initialized (`npm run db:setup`)
   - .env file configured

3. **Admin credentials:**
   - Default: `admin` / `admin123`
   - Customize with environment variables

---

## Environment Variables

```bash
# API Configuration
API_BASE_URL=http://localhost:3000    # API endpoint

# Authentication
TEST_USERNAME=admin                    # Admin username
TEST_PASSWORD=admin123                 # Admin password

# Stress Test Configuration
STRESS_CONCURRENT=50                   # Concurrent users
STRESS_DURATION=30                     # Load test duration (seconds)
STRESS_RPS=100                         # Target requests per second
STRESS_SPIKE=200                       # Spike test users
```

---

## Testing Against Production

⚠️ **WARNING:** Running stress tests against production can impact performance.

```bash
# Comprehensive test against production (safe)
API_BASE_URL=https://api.production.com npm run test:comprehensive

# Stress test against production (USE WITH CAUTION!)
API_BASE_URL=https://api.production.com STRESS_CONCURRENT=10 STRESS_DURATION=10 npm run test:stress
```

**Recommended approach for production:**
1. Test in staging environment first
2. Use lower concurrency (10-20 users)
3. Shorter duration (10-20 seconds)
4. Monitor server metrics during test
5. Schedule during low-traffic periods

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: npm run db:setup

      - name: Start server
        run: npm start &

      - name: Wait for server
        run: npx wait-on http://localhost:3000/health

      - name: Run tests
        run: npm run test:all

      - name: Run stress test (light)
        run: STRESS_CONCURRENT=10 STRESS_DURATION=10 npm run test:stress
```

---

## Troubleshooting

### Server not running
```
Error: connect ECONNREFUSED
```
**Solution:** Start the server with `npm start`

### Authentication failed
```
✗ Authentication failed
```
**Solution:** Check admin credentials in database or use correct TEST_USERNAME/TEST_PASSWORD

### Rate limited
```
Status: 429 Too Many Requests
```
**Solution:** This is expected behavior. Rate limiter is working correctly.

### Database connection errors
```
Error: Connection terminated
```
**Solution:**
- Check PostgreSQL is running
- Verify database credentials in .env
- Ensure database schema is initialized

### High response times
```
⚠ WARNING: System shows some strain under load
```
**Solution:**
- Check server resources (CPU, memory)
- Review database query performance
- Consider scaling infrastructure
- Optimize slow endpoints

---

## Test Data Cleanup

All tests automatically clean up their test data:
- Test contractors are deleted after tests
- Test vehicles are removed
- Test sign-ins are cleaned up

**Manual cleanup** (if tests fail mid-execution):
```sql
-- Delete test contractors
DELETE FROM contractors WHERE company_name LIKE 'Test Company%';

-- Delete test vehicles
DELETE FROM vehicles WHERE registration LIKE 'TEST%';

-- Delete test sign-ins
DELETE FROM sign_ins WHERE full_name LIKE '%Test%';
```

---

## Best Practices

1. **Run tests regularly** - CI/CD pipeline integration
2. **Monitor test results** - Track response times over time
3. **Update tests** - When adding new endpoints
4. **Test in staging first** - Before production deployment
5. **Review failures** - Investigate all test failures
6. **Baseline performance** - Establish acceptable performance metrics

---

## Contributing

When adding new API endpoints:

1. Add tests to `comprehensive-api-test.js`
2. Update this README with new test coverage
3. Ensure all tests pass before merging
4. Add appropriate cleanup for test data

---

## Support

For issues or questions:
- Check logs: Server console output
- Review test output: Detailed error messages
- Database logs: PostgreSQL logs
- API documentation: `/api/docs`
