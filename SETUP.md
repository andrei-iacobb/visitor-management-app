# Visitor Management System - Setup Guide

Complete setup instructions for getting the application running.

---

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 12+
- **Git**

---

## 🚀 Quick Start (Development)

### 1. Clone & Install Dependencies

```bash
cd visitor-management-app/backend
npm install
```

### 2. Setup Database

```bash
# Create database
createdb visitor_management

# Run schema
npm run db:setup

# Or manually:
psql -U postgres -d visitor_management -f database/schema.sql
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate admin password hash
npm run setup:admin

# This will output something like:
# ADMIN_PASSWORD_HASH=$2b$10$dSSszeewZBxQ4.l71Eb9hemPI27/RzeX42/JYT5enePPoKG52k6R.

# The hash is already added to .env file for you!
```

### 4. Update Database Credentials in .env

Edit `.env` file and update:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_management
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password  # ← CHANGE THIS
```

### 5. Start Server

```bash
npm start

# Or for development with auto-reload:
npm run dev
```

### 6. Access Web UI

Open browser: **http://localhost:3000/login.html**

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## 🔒 Production Setup

### 1. Generate Strong Admin Password

```bash
npm run setup:admin YourStrongPasswordHere

# Copy the generated hash to your .env file
```

### 2. Configure Environment Variables

**CRITICAL Production Settings:**

```bash
# .env file

# Server
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=visitor_management
DB_USER=your_db_user
DB_PASSWORD=your_secure_db_password

# JWT (MUST CHANGE!)
JWT_SECRET=generate_a_very_long_random_secret_minimum_64_characters_recommended
JWT_EXPIRES_IN=24h

# Admin (MUST CHANGE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...your_generated_hash...

# Data Archival
ENABLE_DATA_ARCHIVAL=true
ARCHIVAL_CRON_SCHEDULE=0 2 1 * *
ARCHIVAL_RETENTION_DAYS=90

# Logging
LOG_LEVEL=warn

# mTLS (if using certificate authentication)
ENABLE_MTLS=true
CERT_PATH=./certs/server-cert.pem
KEY_PATH=./certs/server-key.pem
CA_PATH=./certs/ca-cert.pem
```

### 3. Generate Strong JWT Secret

```bash
# Generate random 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env:
# JWT_SECRET=<generated_secret_here>
```

### 4. SSL/TLS Configuration

For production, use reverse proxy (nginx/Apache) with SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🧪 Testing

### Run All Tests

```bash
# Basic API tests
npm test

# Comprehensive tests (with JWT auth)
npm run test:comprehensive

# Stress/performance tests
npm run test:stress

# All tests
npm run test:all
```

### Expected Output (Comprehensive Tests)

```
============================================================
Comprehensive Visitor Management API Test Suite
============================================================

Authentication Tests
✓ Login with valid credentials
✓ Invalid credentials rejected
✓ Token verification successful
✓ Invalid token rejected
✓ Unauthorized access blocked

Contractor Tests
✓ Create contractor
✓ Get all contractors
✓ Approve contractor

Vehicle Tests
✓ Create vehicle
✓ Get all vehicles

Sign-In Tests
✓ Create sign-in
✓ Get active visitors
✓ Sign out visitor

...

============================================================
✓ Passed:  23
✗ Failed:  0
⊘ Skipped: 0
Total:     23
Duration:  2.5s
============================================================

🎉 All tests passed! (100.0% pass rate)
```

---

## 🔧 Troubleshooting

### "Admin authentication not properly configured"

**Problem:** Missing ADMIN_PASSWORD_HASH in .env

**Solution:**
```bash
npm run setup:admin
# Follow instructions to add hash to .env
```

### "Cannot connect to database"

**Problem:** Database not running or wrong credentials

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials
psql -U postgres -d visitor_management

# Update .env with correct credentials
```

### "JWT_SECRET not defined"

**Problem:** Missing JWT_SECRET in .env

**Solution:**
```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env:
# JWT_SECRET=<generated_secret>
```

### Tests Failing

**Problem:** Server not running or wrong configuration

**Solution:**
```bash
# Ensure server is running
npm start

# Check .env configuration
cat .env

# Verify database connection
npm run db:setup
```

---

## 📁 Project Structure

```
visitor-management-app/
├── backend/
│   ├── config/          # Database & configuration
│   ├── middleware/      # Auth, rate limiting
│   ├── routes/          # API endpoints
│   ├── scripts/         # Setup & maintenance scripts
│   │   ├── setup-admin.js         # Admin password setup
│   │   └── archive-old-records.js # Data archival
│   ├── tests/           # Test suites
│   │   ├── api-test.js
│   │   ├── comprehensive-api-test.js
│   │   └── stress-test.js
│   ├── utils/           # Logger, helpers
│   ├── server.js        # Main server file
│   ├── .env.example     # Environment template
│   └── package.json
├── web/                 # Web admin interface
│   ├── login.html       # JWT login page
│   ├── index.html       # Admin dashboard
│   └── js/
│       ├── api.js       # API client with JWT
│       └── app.js       # Dashboard logic
└── android/             # Android app
    └── app/src/main/java/com/visitormanagement/app/
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Changed default admin password
- [ ] Generated strong JWT secret (64+ characters)
- [ ] Updated database credentials
- [ ] Enabled SSL/TLS (HTTPS)
- [ ] Set NODE_ENV=production
- [ ] Configured CORS_ORIGIN properly
- [ ] Set LOG_LEVEL=warn or error
- [ ] Enabled data archival with appropriate retention
- [ ] Reviewed and secured all environment variables
- [ ] Set up database backups
- [ ] Configured firewall rules
- [ ] Enabled rate limiting (already done)
- [ ] Tested all functionality
- [ ] Run security audit: `npm audit`

---

## 📊 Data Management

### Manual Data Archival

```bash
# Dry run (no changes)
npm run archive:dry-run

# Actual archival (default: 90 days)
npm run archive:run

# Custom retention period
node scripts/archive-old-records.js --retention-days=180
```

### Scheduled Archival

Configured in `.env`:
```bash
ENABLE_DATA_ARCHIVAL=true
ARCHIVAL_CRON_SCHEDULE=0 2 1 * *  # 1st of month at 2 AM
ARCHIVAL_RETENTION_DAYS=90
```

---

## 🌐 Accessing the Application

### Web Admin Interface
- **Development:** http://localhost:3000/login.html
- **Production:** https://your-domain.com/login.html

### API Endpoints
- **Health Check:** GET /health
- **Authentication:** POST /api/v1/auth/login
- **Contractors:** /api/v1/contractors
- **Vehicles:** /api/v1/vehicles
- **Sign-ins:** /api/v1/sign-ins
- **Documents:** /api/v1/documents
- **SharePoint:** /api/v1/sharepoint

### Android App
Configure server URL in app settings:
- Development: http://YOUR_IP:3000/api/
- Production: https://api.your-domain.com/api/

---

## 📞 Support

For issues:
1. Check this SETUP.md
2. Review `tests/README.md` for testing issues
3. Check `SHAREPOINT_INTEGRATION_PLAN.md` for SharePoint
4. Review `android/BUILD_CONFIG_PRODUCTION.md` for Android

---

## ⚠️ IMPORTANT NOTES

1. **NEVER commit .env file** - It's in .gitignore for a reason
2. **Change default passwords** - admin123 is NOT secure
3. **Use strong JWT secret** - Minimum 64 characters
4. **Enable HTTPS in production** - Use reverse proxy
5. **Regular backups** - Set up automated database backups
6. **Monitor logs** - Check Winston logs regularly
7. **Update dependencies** - Run `npm audit` periodically

---

**You're all set! 🚀**

For questions or issues, refer to the documentation files in the repository.
