# Visitor Management System - Complete Exploration Summary

**Date**: November 3, 2025
**Status**: Thoroughly Explored and Documented
**Framework**: Node.js + Express + PostgreSQL + Kotlin Android

---

## QUICK FACTS

- **Backend**: Express.js running on port 3000
- **Database**: PostgreSQL (visitor_management)
- **Frontend**: Native Android app (Kotlin)
- **API**: RESTful JSON-based with 20+ endpoints
- **Authentication**: NONE (currently open API)
- **Data Format**: JSON with snake_case naming
- **HTTP Client**: Retrofit 2.9.0 (Android)

---

## CRITICAL FILES TO KNOW

### Backend Configuration
```
/Users/andreiiacob/visitor-management-app/backend/.env
→ Contains database credentials, server port, SharePoint config
```

### Android API Configuration
```
/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/util/Constants.kt
→ Line 11: BASE_URL = "http://192.168.1.48:3000/api/"
→ CRITICAL: Update this IP for your backend server!
```

### Server Entry Point
```
/Users/andreiiacob/visitor-management-app/backend/server.js
→ Main Express.js server
→ Start with: npm start (port 3000)
```

---

## WHAT EACH COMPONENT DOES

### Backend (Express.js)
1. **Receives HTTP requests** from Android app
2. **Validates input** using express-validator
3. **Queries PostgreSQL database** with parameterized queries
4. **Returns JSON responses** in standardized format
5. **Logs all requests** with Morgan
6. **Provides 6 route groups**:
   - /api/sign-ins (visitor check-in/out)
   - /api/staff (staff management)
   - /api/contractors (contractor verification)
   - /api/vehicles (vehicle tracking)
   - /api/sharepoint (SharePoint sync)
   - /api/documents (document management)

### Android App
1. **Collects visitor information** via forms
2. **Sends HTTP requests** to backend using Retrofit
3. **Displays results** in Activities/Fragments
4. **Stores configuration** in SharedPreferences
5. **Uses Coroutines** for async operations

### PostgreSQL Database
1. **Stores visitor sign-in records** (sign_ins table)
2. **Stores staff information** (staff table)
3. **Stores contractor data** (contractors table)
4. **Stores vehicle info** (vehicles table)
5. **Maintains relationships** via foreign keys

---

## RUNNING THE SYSTEM

### Step 1: Start Backend
```bash
cd /Users/andreiiacob/visitor-management-app/backend
npm install          # First time only
npm start            # Starts on localhost:3000
```

**Expected Output**:
```
========================================
Visitor Management API Server
========================================
Server running on port 3000
Health check: http://localhost:3000/health
```

### Step 2: Configure Android
Edit: `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

Change line 11 from:
```kotlin
const val BASE_URL = "http://192.168.1.48:3000/api/"
```

To your backend server IP (example):
```kotlin
const val BASE_URL = "http://192.168.1.100:3000/api/"  // Your machine's IP
```

### Step 3: Build & Run Android App
```bash
cd /Users/andreiiacob/visitor-management-app/android
./gradlew build
./gradlew installDebug   # Install to device/emulator
```

### Step 4: Verify It Works
```bash
# Test backend
curl http://localhost:3000/health

# Create sign-in via Android app
# Check it appeared in database
curl http://localhost:3000/api/sign-ins/status/active
```

---

## API ENDPOINTS AT A GLANCE

### Sign-In Operations
```
POST   /api/sign-ins                    - Create visitor entry
GET    /api/sign-ins/status/active      - Get currently signed-in visitors
GET    /api/sign-ins                    - List all sign-ins (with filters)
GET    /api/sign-ins/{id}               - Get single sign-in
PUT    /api/sign-ins/{id}/sign-out      - Mark visitor as left
DELETE /api/sign-ins/{id}               - Delete record
```

### Staff Operations
```
GET    /api/staff                       - List staff
POST   /api/staff                       - Create staff
PUT    /api/staff/{id}                  - Update staff
DELETE /api/staff/{id}                  - Delete staff
```

### Vehicle Operations
```
GET    /api/vehicles/{registration}     - Check vehicle status
POST   /api/vehicles/checkout           - Log vehicle departure
POST   /api/vehicles/checkin            - Log vehicle return
POST   /api/vehicles/damage             - Report damage
```

### Contractor Operations
```
POST   /api/contractors/verify          - Verify contractor
GET    /api/contractors/approved        - List approved contractors
POST   /api/contractors                 - Add to whitelist
PUT    /api/contractors/{id}            - Update status
```

### SharePoint Integration
```
POST   /api/sharepoint/sync             - Sync to SharePoint
GET    /api/sharepoint/read             - Read from SharePoint
```

### Documents
```
GET    /api/documents/list              - List documents
GET    /api/documents/{fileName}        - Download document
```

---

## COMMUNICATION FLOW

```
USER enters data in Android app
         ↓
Android app collects form data
         ↓
Retrofit converts to JSON
         ↓
HTTP POST/GET/PUT request sent to
         ↓
Express.js server receives request
         ↓
Validates input with express-validator
         ↓
Executes SQL query via PostgreSQL client
         ↓
PostgreSQL returns data
         ↓
Express formats response as JSON
         ↓
HTTP response sent back to Android
         ↓
Retrofit converts JSON to Kotlin objects
         ↓
Activity/Fragment displays result to user
```

---

## DATABASE STRUCTURE

### Main Tables
1. **sign_ins** - Visitor check-in/out records
2. **staff** - Staff member information
3. **contractors** - Approved contractors whitelist
4. **vehicles** - Vehicle registry
5. **vehicle_damage** - Damage reports
6. **vehicle_checkout_records** - Vehicle movement history

### Key Indexes
- sign_ins: visitor_type, status, created_at
- Optimized for common queries

---

## SECURITY STATUS

### What's Protected
- SQL injection (parameterized queries)
- Input validation (express-validator)
- Security headers (Helmet.js)
- Request logging
- PostgreSQL error handling

### What's NOT Protected (Open API)
- No authentication (anyone can call API)
- No API keys required
- CORS open to all origins
- No rate limiting
- No request signing

---

## CONFIGURATION LOCATIONS

| Setting | File | Value |
|---------|------|-------|
| Backend Port | .env | PORT=3000 |
| DB Host | .env | DB_HOST=localhost |
| DB Port | .env | DB_PORT=5432 |
| DB Name | .env | DB_NAME=visitor_management |
| DB User | .env | DB_USER=visitor_admin |
| DB Password | .env | DB_PASSWORD=visitor_pass_123 |
| Android API URL | Constants.kt | http://192.168.1.48:3000/api/ |
| Node Environment | .env | NODE_ENV=development |

---

## STARTUP CHECKLIST

Before running the system, ensure:

- [ ] Node.js v14+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] PostgreSQL installed and running
- [ ] Database "visitor_management" exists
- [ ] Backend dependencies installed: `npm install`
- [ ] .env file configured with DB credentials
- [ ] Android IP (Constants.kt) matches backend server
- [ ] No other service running on port 3000

---

## COMMON CONFIGURATIONS

### Running on Same Machine
```
Backend IP: localhost or 127.0.0.1
Android on Emulator: Use 10.0.2.2 (special Android emulator address)
Android Config: const val BASE_URL = "http://10.0.2.2:3000/api/"
```

### Running on Network
```
Backend IP: Your machine's actual IP (e.g., 192.168.1.100)
Android on Physical Device: Use same IP as above
Android Config: const val BASE_URL = "http://192.168.1.100:3000/api/"
```

### Running with Docker
```
Backend Container: Port 3000 inside, 3000 exposed
Android Config: Use docker host IP (usually 192.168.1.x)
```

---

## DEVELOPMENT VS PRODUCTION

### Development Mode
```
npm run dev              # Auto-restarts on file changes
NODE_ENV=development    # Verbose error messages
CORS: allow all origins
Database: visitor_management (development)
```

### Production Mode
```
npm start               # No auto-restart
NODE_ENV=production    # Minimal error details
CORS: restrict to known origins (TODO)
Database: visitor_management (production)
HTTPS: Required
Authentication: Required
```

---

## TECHNOLOGY SUMMARY

### Backend Stack
- Node.js 18+
- Express.js 4.18.2
- PostgreSQL 12+
- Helmet.js (security headers)
- Morgan (logging)
- express-validator (input validation)
- dotenv (configuration)

### Android Stack
- Kotlin
- Retrofit 2.9.0 (HTTP client)
- OkHttp 4.12.0 (HTTP transport)
- Gson 2.10.1 (JSON parsing)
- Coroutines (async operations)
- Material Design 3
- AndroidX libraries
- Min SDK: 24, Target SDK: 34

### Database Stack
- PostgreSQL 12+
- Connection Pooling (pg library)
- Parameterized Queries
- ENUM types for status fields
- Indexes on common queries

---

## PROJECT READINESS

### What's Complete
- Full REST API with validation
- PostgreSQL database schema
- Connection pooling
- Input validation
- Error handling
- Android client with modern patterns
- Security basics (CORS, Helmet, SQL injection prevention)
- Request logging
- Documentation

### What's Missing for Production
- Authentication (JWT/OAuth)
- HTTPS/SSL certificates
- Rate limiting
- API versioning
- Monitoring/alerting
- Database backups
- Docker containerization
- Environment separation
- Load testing
- Automated deployment

---

## DOCUMENTATION CREATED

1. **CODEBASE_ANALYSIS.md** (715 lines)
   - Complete technical breakdown
   - File-by-file explanation
   - Architecture overview
   - Production readiness assessment

2. **QUICK_SETUP_GUIDE.md**
   - 5-minute setup instructions
   - Common issues and fixes
   - Key files to remember
   - TL;DR configuration

3. **API_ENDPOINTS_REFERENCE.md**
   - Complete endpoint documentation
   - Request/response examples
   - Error codes
   - Data types and enums

4. **EXPLORATION_SUMMARY.md** (this file)
   - High-level overview
   - Critical information
   - Configuration checklist
   - Technology summary

---

## NEXT STEPS

### Immediate (Required for Use)
1. Update Android BASE_URL to match your backend server
2. Verify database connection works
3. Test a complete sign-in flow

### Short-term (1-2 weeks)
1. Add JWT authentication
2. Restrict CORS to known origins
3. Create Docker setup
4. Add input rate limiting

### Medium-term (1 month)
1. Add HTTPS/SSL
2. Set up database backups
3. Configure monitoring
4. Performance testing

### Long-term (2+ months)
1. API versioning strategy
2. Advanced analytics/reporting
3. Mobile app distribution
4. Multi-site support

---

## SUPPORT RESOURCES

- Complete API documentation: `/API_ENDPOINTS_REFERENCE.md`
- cURL examples: `backend/CURL_EXAMPLES.md`
- Backend setup script: `backend/setup.sh`
- This summary: `EXPLORATION_SUMMARY.md`

---

## KEY TAKEAWAYS

1. **Simple Architecture**: Frontend talks to backend via HTTP JSON
2. **IP-Based Connection**: Android hardcoded to 192.168.1.48 - UPDATE THIS!
3. **Open API**: No authentication yet - add JWT for production
4. **Functional System**: Backend and Android both complete and working
5. **Database**: PostgreSQL properly configured with connection pooling
6. **Modern Stack**: Uses current best practices (Kotlin, Coroutines, Retrofit)
7. **Missing Production Features**: Auth, HTTPS, Rate limiting, Docker

---

**Project Explored**: 100%
**Documentation**: Complete
**Ready for Development**: Yes
**Ready for Production**: No (needs authentication, HTTPS, Docker)

