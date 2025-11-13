# Visitor Management System - Complete Codebase Analysis

## Executive Summary

This is a **full-stack visitor management application** with:
- **Backend**: Node.js + Express.js + PostgreSQL (Port: 3000)
- **Frontend**: Native Android App (Kotlin) using Retrofit
- **Data Format**: JSON
- **Authentication**: Currently none (open API)
- **Optional**: SharePoint/Azure AD integration for data sync

---

## 1. CURRENT BACKEND SETUP

### Technology Stack
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL 
- **Security**: Helmet.js, express-validator, CORS enabled
- **Logging**: Morgan
- **HTTP Client**: OkHttp (Android side)
- **Port**: 3000 (default)

### File Structure
```
backend/
├── server.js                    # Main Express server
├── config/
│   └── database.js             # PostgreSQL pool configuration
├── routes/
│   ├── signInRoutes.js         # Sign-in/Sign-out endpoints
│   ├── staffRoutes.js          # Staff management endpoints
│   ├── sharepointRoutes.js     # SharePoint sync endpoints
│   ├── contractorValidationRoutes.js
│   ├── documentRoutes.js
│   └── vehicleRoutes.js
├── services/
│   └── sharepointService.js    # Azure AD & SharePoint integration
├── database/
│   └── schema.sql              # PostgreSQL schema
├── package.json                # Dependencies
├── .env                        # Environment configuration
└── setup.sh                    # Automated setup script
```

### Environment Configuration (.env)
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_management
DB_USER=visitor_admin
DB_PASSWORD=visitor_pass_123
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
SHAREPOINT_SITE_ID=your_site_id
SHAREPOINT_DRIVE_ID=your_drive_id
EXCEL_FILE_PATH=/VisitorManagement/SignIns.xlsx
ENABLE_SHAREPOINT=false
```

### Database Configuration
- **Host**: localhost (configurable via .env)
- **Port**: 5432
- **Database**: visitor_management
- **User**: visitor_admin
- **Password**: visitor_pass_123
- **Connection Pool**: Max 20 clients, 30s idle timeout, 2s connection timeout

---

## 2. CURRENT FRONTEND SETUP (Android)

### Technology Stack
- **Language**: Kotlin
- **API Client**: Retrofit 2.9.0
- **HTTP Client**: OkHttp 4.12.0
- **JSON Parsing**: Gson 2.10.1
- **Async**: Kotlin Coroutines
- **Min SDK**: 24
- **Target SDK**: 34
- **Compile SDK**: 34

### API Configuration Location
**File**: `/android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

**Current Configuration**:
```kotlin
const val BASE_URL = "http://192.168.1.48:3000/api/"  // Physical device IP
```

**Important Notes**:
- Currently set to physical device IP: 192.168.1.48
- For Android Emulator: Use 10.0.2.2 instead
- For physical device on same network: Use actual IP address
- Base URL is configurable at runtime via `RetrofitClient.updateBaseUrl()`
- Shared Preferences key: `api_base_url`

### Network Configuration (RetrofitClient.kt)
```kotlin
// Timeouts
CONNECT_TIMEOUT_SECONDS = 15L
TIMEOUT_SECONDS = 30L
WRITE_TIMEOUT_SECONDS = 30L

// HTTP Logging: BODY level (all requests/responses logged)
// Retry on connection failure: Enabled
// JSON parsing: snake_case to camelCase conversion
```

---

## 3. API ENDPOINTS & COMMUNICATION FLOW

### Base URL Structure
```
http://[SERVER_IP]:3000/api/
```

### Complete API Endpoints

#### Sign-In/Sign-Out Operations
```
POST   /api/sign-ins                    - Create new sign-in
GET    /api/sign-ins                    - Get all sign-ins (with filters)
GET    /api/sign-ins/{id}               - Get single sign-in
GET    /api/sign-ins/status/active      - Get currently active visitors
PUT    /api/sign-ins/{id}/sign-out      - Sign out a visitor
DELETE /api/sign-ins/{id}               - Delete sign-in record
```

#### Staff Management
```
GET    /api/staff                       - Get all staff members
POST   /api/staff                       - Create new staff member
PUT    /api/staff/{id}                  - Update staff member
DELETE /api/staff/{id}                  - Delete staff member
```

#### Contractor Verification
```
POST   /api/contractors/verify          - Verify contractor approval
GET    /api/contractors/approved        - Get approved contractors
POST   /api/contractors                 - Add contractor to whitelist
PUT    /api/contractors/{id}            - Update contractor status
```

#### SharePoint Integration
```
POST   /api/sharepoint/sync             - Sync all unsynced records
GET    /api/sharepoint/read             - Read from SharePoint
GET    /api/sharepoint/status           - Check SharePoint status
```

#### Documents
```
GET    /api/documents/list              - List available PDFs
GET    /api/documents/{fileName}        - Download document/image
```

#### Vehicles
```
GET    /api/vehicles/{registration}     - Check vehicle status
POST   /api/vehicles/checkout           - Vehicle check-out
POST   /api/vehicles/checkin            - Vehicle check-in
POST   /api/vehicles/damage             - Report vehicle damage
```

#### Health Check
```
GET    /health                          - API health check
GET    /                                - Root endpoint (API info)
```

### Request/Response Format

**Success Response (201/200)**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": 1,
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com",
    "company_name": "ACME Corp",
    "purpose_of_visit": "Business meeting",
    "car_registration": "ABC123",
    "visiting_person": "Jane Smith",
    "sign_in_time": "2025-01-15T10:30:00Z",
    "sign_out_time": null,
    "status": "signed_in",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Error Response (400/500)**:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "msg": "Full name must be between 2 and 255 characters",
      "param": "full_name",
      "location": "body"
    }
  ]
}
```

### Data Format
- **Content-Type**: application/json
- **Character Encoding**: UTF-8
- **Field Naming**: snake_case (backend) → camelCase (Android via Gson)
- **Max Body Size**: 10MB (for photos/signatures as base64)
- **Image Format**: Base64 encoded

### Pagination Query Parameters
```
?limit=50       # Number of records to return
?offset=0       # Starting record number (0-indexed)
?status=        # Filter by status (signed_in, signed_out)
?visitor_type=  # Filter by type (visitor, contractor)
```

---

## 4. BACKEND STRUCTURE IN DETAIL

### Server Startup (server.js)
```javascript
npm start          # Production: node server.js
npm run dev        # Development: nodemon server.js
npm test           # Run tests
```

**Startup Process**:
1. Load environment variables from .env
2. Initialize Express app with middleware:
   - Helmet security headers
   - CORS (allow all origins)
   - Request logging (Morgan)
   - JSON body parser (10MB limit)
3. Test database connection
4. Mount routes:
   - /api/sign-ins
   - /api/staff
   - /api/sharepoint
   - /api/contractors
   - /api/documents
   - /api/vehicles
5. Setup error handlers
6. Start listening on PORT (default: 3000)

### Database Configuration (config/database.js)
```javascript
// Connection pool settings
max: 20 clients
idleTimeoutMillis: 30000 (30 seconds)
connectionTimeoutMillis: 2000 (2 seconds)

// Methods
pool.query(sql, params)        // Execute query
pool.connect()                 // Get client from pool
transaction(callback)          // Transactional operations
testConnection()              // Health check
```

### Route Validation
All routes use express-validator for input validation:
- Email format validation
- Required field validation
- Length constraints
- Type validation (visitor, contractor)

### CORS Configuration
```javascript
origin: '*'                              // Allow any origin (NOT production!)
methods: ['GET', 'POST', 'PUT', 'DELETE']
allowedHeaders: ['Content-Type', 'Authorization']
```

### Security Headers (Helmet)
```javascript
// Content Security Policy
defaultSrc: ["'self'"]
scriptSrc: ["'self'", "'unsafe-inline'"]  // For admin dashboard
styleSrc: ["'self'", "'unsafe-inline'"]
imgSrc: ["'self'", "data:"]
```

### Caching Headers for API
```
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

---

## 5. FRONTEND STRUCTURE (Android)

### API Client Setup (RetrofitClient.kt)
```kotlin
// Singleton object
// OkHttp client with:
// - HttpLoggingInterceptor (BODY level)
// - Retry on connection failure
// - Custom timeouts

// Gson configuration:
// - Lenient parsing
// - snake_case ↔ camelCase conversion
```

### API Service Interface (ApiService.kt)
Defines 15+ suspend functions for Retrofit:
- createSignIn()
- getSignIns()
- getActiveVisitors()
- signOutVisitor()
- verifyContractor()
- checkoutVehicle()
- checkinVehicle()
- reportVehicleDamage()
- etc.

### Data Models
```
SignIn.kt                    # Visitor/Contractor sign-in data
SignInRequest.kt             # POST request body
Vehicle.kt                   # Vehicle information
VehicleStatusResponse.kt      # Vehicle status data
ContractorVerificationRequest/Response.kt
ApiResponse<T>.kt            # Generic API response wrapper
```

### Repository Pattern (VisitorRepository.kt)
```kotlin
// Handles all API calls
// Uses Coroutines for async operations
// Error handling and result wrapping
// Methods:
- createSignIn()
- getActiveVisitors()
- signOutVisitor()
- healthCheck()
```

### Activity/Fragment Integration
```
MainActivity.kt                  # Main entry point
SignInActivity.kt               # Sign-in form screen
SignOutActivity.kt              # Sign-out screen
AdminDashboardActivity.kt        # Admin panel
ActiveVisitorsFragment.kt        # Display active visitors
```

---

## 6. AUTHENTICATION & SECURITY

### Current State
- **Authentication**: NONE (open API)
- **Authorization**: NONE
- **Rate Limiting**: NOT implemented
- **API Keys**: NOT used

### Security Features Present
1. Input validation (express-validator)
2. SQL injection protection (parameterized queries)
3. Helmet security headers
4. CORS configuration
5. Error handling (no stack traces in production)
6. SQL error handling (PostgreSQL specific codes)

### Security Gaps for Production
1. No authentication (anyone can call API)
2. CORS open to all origins
3. No rate limiting
4. No API key validation
5. No request signing
6. Base URL hardcoded in Android app

---

## 7. DATABASE SCHEMA

### Main Tables
```sql
-- sign_ins table
CREATE TABLE sign_ins (
  id SERIAL PRIMARY KEY,
  visitor_type ENUM('visitor', 'contractor'),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  company_name VARCHAR(255),
  purpose_of_visit TEXT NOT NULL,
  car_registration VARCHAR(50),
  visiting_person VARCHAR(255) NOT NULL,
  document_acknowledged BOOLEAN,
  document_acknowledgment_time TIMESTAMP,
  sign_in_time TIMESTAMP DEFAULT NOW(),
  sign_out_time TIMESTAMP,
  status ENUM('signed_in', 'signed_out') DEFAULT 'signed_in',
  sharepoint_synced BOOLEAN DEFAULT FALSE,
  sharepoint_sync_time TIMESTAMP,
  sharepoint_sync_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_visitor_type ON sign_ins(visitor_type);
CREATE INDEX idx_status ON sign_ins(status);
CREATE INDEX idx_created_at ON sign_ins(created_at);

-- staff table
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Other tables: contractors, vehicles, vehicle_damage, etc.
```

---

## 8. PRODUCTION READINESS ASSESSMENT

### What's Ready for Production
- Database schema and pooling ✓
- Input validation ✓
- Error handling ✓
- Security headers (Helmet) ✓
- Async/await pattern ✓
- CORS configuration ✓
- Logging (Morgan) ✓
- Environment-based configuration ✓

### What's NOT Ready for Production
- **Authentication**: Needs OAuth2, JWT, or API keys
- **CORS**: Should restrict to known domains
- **Rate Limiting**: Needs implementation
- **SSL/TLS**: HTTPS not configured
- **Monitoring**: No monitoring/alerting
- **Database**: No backup/disaster recovery
- **Android Hardcoding**: Base URL hardcoded in app
- **Error Messages**: Too verbose in some cases
- **API Versioning**: No versioning strategy

### Docker/Container Status
- **Docker**: NOT set up (no Dockerfile found)
- **Docker Compose**: NOT set up
- **Deployment**: Manual setup only

---

## 9. RUNNING THE APPLICATION

### Backend Startup

#### Prerequisites
```bash
# Required
node --version    # v14+
npm --version
psql --version    # PostgreSQL client

# Services
PostgreSQL running on localhost:5432
```

#### Quick Start
```bash
cd backend

# Option 1: Automated setup
bash setup.sh

# Option 2: Manual setup
npm install
cp .env.example .env
# Edit .env with your database credentials

# Create database
createdb visitor_management
psql -U postgres -d visitor_management -f database/schema.sql

# Start server
npm start              # Production
npm run dev            # Development (with auto-reload)
```

#### Verify Backend Running
```bash
curl http://localhost:3000/health
# Expected response:
# {
#   "success": true,
#   "message": "Visitor Management API is running",
#   "timestamp": "2025-01-15T10:30:00.000Z",
#   "uptime": 45.123
# }
```

### Android App Configuration

#### Current IP Configuration
- **File**: `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`
- **Current Value**: `http://192.168.1.48:3000/api/`
- **Change Required**: Update IP to match backend machine

#### Build & Run
```bash
cd android

# Build
./gradlew build

# Debug on emulator
./gradlew installDebug

# Physical device
./gradlew installDebug
# Then run from Android Studio or adb
```

#### Emulator Configuration
For Android Emulator to reach host machine:
```kotlin
// In Constants.kt
const val BASE_URL = "http://10.0.2.2:3000/api/"
```

---

## 10. DOCKER & PROXY SETUP (Recommended)

### Suggested Dockerfile for Backend
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

### Suggested Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: visitor_management
      DB_USER: visitor_admin
      DB_PASSWORD: visitor_pass_123
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: visitor_management
      POSTGRES_USER: visitor_admin
      POSTGRES_PASSWORD: visitor_pass_123

volumes:
  postgres_data:
```

### Nginx Proxy Configuration (for HTTPS/Reverse Proxy)
```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Android App Changes for Docker/Proxy
```kotlin
// For Docker (local network)
const val BASE_URL = "http://192.168.1.x:3000/api/"  // Docker host IP

// For Reverse Proxy (HTTPS)
const val BASE_URL = "https://api.example.com/api/"
```

---

## 11. KEY FINDINGS & RECOMMENDATIONS

### Current State Summary
1. **Functional Full-Stack App**: Backend is complete and working
2. **API-Driven Architecture**: Clean separation between backend and Android
3. **Database**: PostgreSQL with proper schema and pooling
4. **Android Client**: Uses modern Kotlin + Retrofit + Coroutines
5. **Hardcoded IP**: Android app has hardcoded backend IP (192.168.1.48)

### Immediate Actions for Production
1. **Update Android IP**: Configure for your backend server
2. **Add Authentication**: JWT tokens or API keys
3. **Restrict CORS**: Only allow known origins
4. **Add HTTPS**: SSL/TLS certificates required
5. **Containerize**: Create Dockerfile and docker-compose.yml
6. **Database Backup**: Set up PostgreSQL backups
7. **Monitoring**: Add logging/monitoring solution
8. **Rate Limiting**: Implement express-rate-limit

### Network Architecture
```
Android App (192.168.1.x:xxxx)
    ↓ (HTTP REST JSON)
Backend Server (192.168.1.48:3000)
    ↓ (TCP)
PostgreSQL (localhost:5432)
    ↓ (TCP)
SQL Database
```

### File Locations Summary
- Backend: `/Users/andreiiacob/visitor-management-app/backend/`
- Android: `/Users/andreiiacob/visitor-management-app/android/`
- Environment: `/Users/andreiiacob/visitor-management-app/backend/.env`
- API Config: `/Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

---

## 12. TESTING THE API

### Health Check
```bash
curl http://localhost:3000/health
```

### Create Sign-In
```bash
curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com",
    "company_name": "ACME Corp",
    "purpose_of_visit": "Business meeting",
    "visiting_person": "Jane Smith"
  }'
```

### Get Active Visitors
```bash
curl http://localhost:3000/api/sign-ins/status/active
```

### Sign Out
```bash
curl -X PUT http://localhost:3000/api/sign-ins/1/sign-out
```

---

## CONCLUSION

This is a well-structured visitor management system with:
- **Completed Backend**: Express.js + PostgreSQL (fully functional)
- **Completed Android App**: Native Kotlin with Retrofit
- **Clean Architecture**: MVC pattern on backend, Repository pattern on Android
- **Missing Security**: Authentication and authorization not implemented
- **Missing Docker**: No containerization yet
- **Hardcoded Configuration**: Android IP address hardcoded

**Next Steps**: Add authentication, containerize, configure CORS for production, and update Android IP configuration.
