# Visitor Management System - Quick Setup & Configuration Guide

## TL;DR - Key Configuration Points

### Backend Running Command
```bash
cd backend
npm install
npm start  # Runs on http://localhost:3000
```

### Android API Server IP
**File to Update**: `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

**Current Setting**:
```kotlin
const val BASE_URL = "http://192.168.1.48:3000/api/"
```

**For Emulator**: Change to `"http://10.0.2.2:3000/api/"`

**For Different Network**: Update 192.168.1.48 to your backend server IP

---

## 1. BACKEND SETUP (5 minutes)

### Prerequisites Check
```bash
node --version        # Should be v14 or higher
npm --version         # Should be v6 or higher
psql --version        # PostgreSQL client
```

### Installation & Running
```bash
cd backend
npm install
npm start
```

Expected output:
```
========================================
Visitor Management API Server
========================================
Server running on port 3000
API URL: http://localhost:3000
Health check: http://localhost:3000/health
```

### Database Connection
The backend automatically connects to PostgreSQL on:
- Host: localhost
- Port: 5432
- Database: visitor_management
- User: visitor_admin
- Password: visitor_pass_123

If PostgreSQL isn't set up, run:
```bash
cd backend
bash setup.sh  # Interactive setup
```

---

## 2. ANDROID APP SETUP

### Update Server IP (CRITICAL)
File: `/android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

Line 11:
```kotlin
// BEFORE (don't use this):
const val BASE_URL = "http://192.168.1.48:3000/api/"

// AFTER (use your server IP):
const val BASE_URL = "http://YOUR_SERVER_IP:3000/api/"
```

### Build & Run
```bash
cd android
./gradlew build
./gradlew installDebug   # Install to emulator/device
```

### Emulator vs Physical Device
- **Emulator**: Use `http://10.0.2.2:3000/api/`
- **Physical Device on Same Network**: Use your machine's IP (e.g., 192.168.1.100)
- **Remote Server**: Use full domain/IP address

---

## 3. API ENDPOINTS QUICK REFERENCE

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
    "company_name": "ACME",
    "purpose_of_visit": "Meeting",
    "visiting_person": "Jane Smith"
  }'
```

### Get Active Visitors
```bash
curl http://localhost:3000/api/sign-ins/status/active
```

### Sign Out (Replace 1 with actual ID)
```bash
curl -X PUT http://localhost:3000/api/sign-ins/1/sign-out
```

---

## 4. ENVIRONMENT VARIABLES

File: `backend/.env`

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_management
DB_USER=visitor_admin
DB_PASSWORD=visitor_pass_123

# Optional: SharePoint
ENABLE_SHAREPOINT=false
AZURE_TENANT_ID=your_id
AZURE_CLIENT_ID=your_id
AZURE_CLIENT_SECRET=your_secret
```

---

## 5. COMMON ISSUES & FIXES

### Issue: Port 3000 Already in Use
```bash
# Find process using port
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### Issue: Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres

# Create database if missing
createdb visitor_management

# Apply schema
psql -U postgres -d visitor_management -f backend/database/schema.sql
```

### Issue: Android App Can't Connect to Backend
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check Android IP setting in Constants.kt
3. For emulator, use `10.0.2.2` instead of `localhost`
4. For physical device, use your machine's IP from `ifconfig` or `ipconfig`
5. Ensure both devices are on same network (no firewall blocking)

### Issue: CORS Error in Android
- Android app sends requests to `http://[IP]:3000/api/`
- Backend CORS is configured to allow all origins
- If error persists, check Content-Type header is `application/json`

---

## 6. PROJECT STRUCTURE AT A GLANCE

```
visitor-management-app/
├── backend/                          # Express.js server
│   ├── server.js                    # Entry point
│   ├── config/database.js           # PostgreSQL config
│   ├── routes/                      # API endpoints
│   ├── services/                    # Business logic
│   ├── package.json                 # Dependencies
│   └── .env                         # Configuration
│
├── android/                          # Kotlin Android app
│   ├── app/src/main/java/
│   │   └── com/visitormanagement/
│   │       ├── data/api/            # Retrofit configuration
│   │       │   ├── RetrofitClient.kt
│   │       │   └── ApiService.kt
│   │       ├── util/Constants.kt     # BASE_URL HERE
│   │       ├── data/repository/      # Data layer
│   │       └── ui/                   # Activities/Fragments
│   └── build.gradle.kts
│
└── web/                              # Web admin dashboard
```

---

## 7. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────┐
│      Android App (Kotlin)       │
│  RetrofitClient → ApiService    │
│  VisitorRepository              │
└──────────────┬──────────────────┘
               │ HTTP POST/GET/PUT
               │ JSON
               ↓
┌─────────────────────────────────┐
│   Express.js Server (Port 3000) │
│   Routes → Services → Database  │
└──────────────┬──────────────────┘
               │ TCP Connection
               ↓
┌─────────────────────────────────┐
│  PostgreSQL (Port 5432)         │
│  sign_ins, staff, contractors   │
└─────────────────────────────────┘
```

---

## 8. DEVELOPMENT WORKFLOW

### Terminal 1: Start Backend
```bash
cd backend
npm run dev  # Auto-restarts on file changes
```

### Terminal 2: Run Android App
```bash
cd android
./gradlew installDebug
# Or open in Android Studio and run
```

### Terminal 3: Test API (Optional)
```bash
curl http://localhost:3000/api/sign-ins/status/active
```

---

## 9. PRODUCTION DEPLOYMENT CHECKLIST

- [ ] Update Android BASE_URL to production server IP
- [ ] Change `NODE_ENV=production` in .env
- [ ] Set secure database password
- [ ] Enable HTTPS (add SSL certificates)
- [ ] Add authentication/JWT tokens
- [ ] Restrict CORS to known origins
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Test all API endpoints
- [ ] Build release APK for Android

---

## 10. KEY FILES TO REMEMBER

| File | Purpose | Change When |
|------|---------|-----------|
| `backend/server.js` | Backend entry point | Modifying API routes |
| `backend/.env` | Configuration | Changing server/DB settings |
| `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt` | API URL config | Changing backend server |
| `android/app/src/main/java/com/visitormanagement/app/data/api/ApiService.kt` | API endpoints | Adding new endpoints |
| `backend/routes/signInRoutes.js` | Sign-in API | Modifying sign-in logic |

---

## QUICK START COMMAND SEQUENCE

```bash
# 1. Start backend
cd /Users/andreiiacob/visitor-management-app/backend
npm install
npm start

# 2. In another terminal, update Android IP
nano /Users/andreiiacob/visitor-management-app/android/app/src/main/java/com/visitormanagement/app/util/Constants.kt
# Change: const val BASE_URL = "http://192.168.1.48:3000/api/" 
# To: const val BASE_URL = "http://YOUR_IP:3000/api/"

# 3. Build Android app
cd /Users/andreiiacob/visitor-management-app/android
./gradlew installDebug

# 4. Test backend
curl http://localhost:3000/health
```

---

## SUPPORT

- API Documentation: See `CODEBASE_ANALYSIS.md`
- Backend docs: See `backend/README.md`
- Android docs: See `android/README.md`
- Test endpoints: See `backend/CURL_EXAMPLES.md`

