# Backend-Frontend Communication & Production Setup Guide

## Current Architecture

### Technology Stack
- **Backend**: Express.js + PostgreSQL
- **Frontend**: Native Android (Kotlin) with Retrofit 2
- **Communication**: HTTP JSON REST API

---

## COMMANDS TO RUN FOR BACKEND-FRONTEND COMMUNICATION

### 1. **Backend Setup & Startup**

#### Prerequisites
```bash
# Install Node.js dependencies
cd backend
npm install

# Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql postgresql-contrib
# Windows: Download from https://www.postgresql.org/download/windows/
```

#### Database Setup
```bash
# Start PostgreSQL service
# macOS: brew services start postgresql
# Ubuntu: sudo systemctl start postgresql
# Windows: Check Services app for PostgreSQL service

# Create database and user (run as postgres user)
psql -U postgres
  CREATE DATABASE visitor_management;
  CREATE USER visitor_admin WITH PASSWORD 'visitor_pass_123';
  ALTER ROLE visitor_admin SET client_encoding TO 'utf8';
  ALTER ROLE visitor_admin SET default_transaction_isolation TO 'read committed';
  ALTER ROLE visitor_admin SET default_transaction_deferrable TO on;
  ALTER ROLE visitor_admin SET default_transaction_read_only TO off;
  GRANT ALL PRIVILEGES ON DATABASE visitor_management TO visitor_admin;
  \q

# Run database migrations (if migrations exist)
# cd backend && npm run migrate
```

#### Start Backend Server
```bash
# Development mode with nodemon (auto-restart on file changes)
cd backend
npm install -g nodemon
nodemon server.js

# Or production mode
NODE_ENV=production node server.js

# Server will be available at: http://localhost:3000
# Health check: http://localhost:3000/health
```

---

### 2. **Android Frontend Configuration**

#### Update API URL
Edit: `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

```kotlin
const val BASE_URL = "http://<YOUR_BACKEND_IP>:3000/api/"
```

**Replace `<YOUR_BACKEND_IP>` with:**
- **If Android Emulator**: `10.0.2.2` (host machine localhost)
- **If Physical Device**: Your computer's IP (e.g., `192.168.1.100`)
- **If Same Network**: Backend server IP

#### Build & Deploy Android APK
```bash
# Build debug APK
cd android
./gradlew assembleDebug

# Install on connected device
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.visitormanagement.app/.ui.main.MainActivity
```

---

### 3. **Verify Communication**

Test that frontend connects to backend:

```bash
# Check backend is running
curl http://localhost:3000/health

# Expected response:
# {
#   "success": true,
#   "message": "Visitor Management API is running",
#   "timestamp": "2025-11-03T...",
#   "uptime": 123.456
# }

# Check API endpoints
curl http://localhost:3000/api/sign-ins

# Check database connectivity
curl http://localhost:3000/api/sign-ins/status/active
```

---

## PRODUCTION SETUP: DOCKER & PROXY CONFIGURATION

### Problem: Current State
- **IP Address Hardcoded**: Android app hardcoded to `192.168.1.48:3000`
- **Not Secure**: HTTP, no SSL/TLS
- **Not Scalable**: Can't handle multiple backend instances
- **Not Resilient**: Direct IP means app breaks if backend moves

### Solution: Docker + Reverse Proxy

#### Overview
```
┌─────────────┐
│ Android App │  (Points to: api.yourdomain.com)
└──────┬──────┘
       │ HTTPS
       ▼
┌──────────────────┐
│ Nginx Proxy      │  (Port 443)
│ (Reverse Proxy)  │
└──────┬───────────┘
       │ HTTP (internal)
       ▼
┌──────────────────┐
│ Docker Container │  (Express.js)
│ visitor-api:3000 │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ PostgreSQL       │
│ Container        │
└──────────────────┘
```

---

## PRODUCTION SETUP STEPS

### 1. Create Dockerfile for Backend

Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  # Backend API
  visitor-api:
    build: ./backend
    container_name: visitor-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=visitor_management
      - DB_USER=visitor_admin
      - DB_PASSWORD=visitor_pass_123
      - CORS_ORIGIN=https://api.yourdomain.com
    depends_on:
      - postgres
    networks:
      - visitor-network
    restart: unless-stopped

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: visitor-db
    environment:
      - POSTGRES_DB=visitor_management
      - POSTGRES_USER=visitor_admin
      - POSTGRES_PASSWORD=visitor_pass_123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - visitor-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U visitor_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: visitor-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro  # TODO: Add SSL certificates
    depends_on:
      - visitor-api
    networks:
      - visitor-network
    restart: unless-stopped

networks:
  visitor-network:
    driver: bridge

volumes:
  postgres_data:
```

### 3. Create Nginx Configuration

Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream visitor_api {
        server visitor-api:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl;
        server_name api.yourdomain.com;

        # TODO: Add SSL certificate paths
        # ssl_certificate /etc/nginx/ssl/cert.pem;
        # ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://visitor_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support (if needed)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Health check endpoint
        location /health {
            proxy_pass http://visitor_api;
        }
    }
}
```

### 4. Update Android App for Production

Edit `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`:

```kotlin
// For production builds, use proxy domain instead of IP
const val BASE_URL = "https://api.yourdomain.com/api/"  // Production proxy URL
```

Or use BuildConfig for environment-specific URLs:

```kotlin
const val BASE_URL = if (BuildConfig.DEBUG) {
    "http://192.168.1.48:3000/api/"  // Development
} else {
    "https://api.yourdomain.com/api/"  // Production
}
```

---

## COMPLETE DOCKER STARTUP COMMAND

```bash
# Navigate to project root
cd /Users/andreiiacob/visitor-management-app

# Start all services (backend, database, proxy)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## PRODUCTION CHECKLIST

### TODO Items Embedded in Code
These TODOs have been added to relevant production files:

**Backend (server.js)**
- [ ] Configure CORS_ORIGIN environment variable with proxy URL
- [ ] Change morgan logging format from 'dev' to 'combined'
- [ ] Implement structured logging (Winston/Pino) for Docker
- [ ] Configure static file serving via Nginx instead of Express
- [ ] Set NODE_ENV=production environment variable
- [ ] Bind to 0.0.0.0 for containerized environments

**Database Configuration (config/database.js)**
- [ ] Reduce connection pool max from 20 to 10-15 for containers
- [ ] Increase idleTimeoutMillis to 60000ms for Kubernetes
- [ ] Use database service DNS (db-service) instead of localhost
- [ ] Enable SSL for database connections
- [ ] Add connection retry logic

**Environment (.env.example)**
- [ ] Use secrets manager for credentials (AWS Secrets Manager, Vault)
- [ ] For Docker: Use database service DNS endpoint
- [ ] For Kubernetes: Use service DNS
- [ ] Enable SSL_MODE=require for production

**Android (Constants.kt)**
- [ ] Replace hardcoded IP with proxy URL
- [ ] Load BASE_URL from BuildConfig for environment-specific URLs
- [ ] Use HTTPS instead of HTTP
- [ ] Implement certificate pinning

**Retrofit Client (RetrofitClient.kt)**
- [ ] Disable verbose logging in production builds
- [ ] Add certificate pinning for HTTPS
- [ ] Implement authentication token interceptors
- [ ] Handle proxy authentication if required
- [ ] Configure connection pool for containerized backends

---

## SECURITY CONSIDERATIONS FOR PRODUCTION

1. **SSL/TLS Certificates**: Use Let's Encrypt for free certificates
2. **Environment Variables**: Never commit secrets, use .env files (git-ignored)
3. **Database**: Restrict access to backend container only
4. **CORS**: Whitelist only your proxy domain
5. **Rate Limiting**: Implement in Nginx or Express
6. **Authentication**: Add JWT tokens for API endpoints
7. **Logging**: Use structured logging for security audit trails

---

## QUICK REFERENCE

### Development
```bash
# Terminal 1: Backend
cd backend && npm install && npm start

# Terminal 2: Emulator/Device
cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Production
```bash
# Docker Compose
docker-compose up -d

# Verify
curl https://api.yourdomain.com/health
```

---

## Database Credentials (Development)

| Parameter | Value |
|-----------|-------|
| Host | localhost (dev) / postgres (docker) |
| Port | 5432 |
| Database | visitor_management |
| Username | visitor_admin |
| Password | visitor_pass_123 |

**⚠️ TODO: Change password in production!**

---

## Troubleshooting

### Backend won't connect to Android app
- Check IP address in Constants.kt
- Verify backend is running: `curl http://localhost:3000/health`
- Check firewall allows port 3000

### Docker container exits immediately
- Check logs: `docker-compose logs visitor-api`
- Verify database is ready before app starts

### Proxy not routing correctly
- Check Nginx config: `docker exec visitor-proxy nginx -t`
- Verify upstream is reachable: `docker exec visitor-proxy curl http://visitor-api:3000/health`

