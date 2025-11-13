# Production Setup TODOs - Complete Summary

## Overview
This document catalogs all TODO comments added to the codebase for production deployment with Docker and reverse proxy configuration.

---

## FILES MODIFIED

### 1. **Backend - Server Configuration**
**File**: `backend/server.js`

#### TODO #1: CORS Configuration (Line 35-37)
```javascript
// TODO: PRODUCTION - Configure CORS whitelist with proxy URL instead of '*'
// TODO: PRODUCTION - Use environment variable for allowed origins (e.g., CORS_ORIGIN from .env)
// Example: origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
```
**Action Required**: Set `CORS_ORIGIN` environment variable to your proxy domain

#### TODO #2: Logging Configuration (Line 45-46)
```javascript
// TODO: PRODUCTION - Change morgan format from 'dev' to 'combined' for production logs
// TODO: PRODUCTION - Implement structured logging (Winston/Pino) for Docker/ECS environments
```
**Action Required**: Switch to structured logging for containerized environments

#### TODO #3: Static File Serving (Line 54-56)
```javascript
// TODO: PRODUCTION - Configure static file serving via CDN or reverse proxy (Nginx) instead of Express
// TODO: PRODUCTION - Set proper cache headers for static assets (Cache-Control, ETag)
// TODO: PRODUCTION - Consider separate static server or S3/CloudFront for public files in containerized environment
```
**Action Required**: Offload static file serving to Nginx or CDN

#### TODO #4: Server Initialization (Line 183-186)
```javascript
// TODO: PRODUCTION - Set environment to production via NODE_ENV environment variable
// TODO: PRODUCTION - Use database connection pooling optimized for containerized environments
// TODO: PRODUCTION - Implement health check endpoint for container orchestration (Docker/Kubernetes)
// TODO: PRODUCTION - Add readiness probe for graceful startup detection in orchestration
// TODO: PRODUCTION - Bind to 0.0.0.0 instead of localhost for container environments
```
**Action Required**: Configure environment variables and readiness probes

---

### 2. **Database Configuration**
**File**: `backend/config/database.js`

#### TODO #5-10: Database Pool Configuration (Line 5-10)
```javascript
// TODO: PRODUCTION - Adjust pool settings for containerized environment:
// TODO: PRODUCTION - Reduce 'max' from 20 to 10-15 for containerized backends (memory constraints)
// TODO: PRODUCTION - Increase idleTimeoutMillis to 60000ms for Kubernetes environments with frequent restarts
// TODO: PRODUCTION - Use database service DNS (e.g., db-service.default.svc.cluster.local) instead of localhost
// TODO: PRODUCTION - Enable SSL for database connections (require_ssl: true, ssl: {rejectUnauthorized: false})
// TODO: PRODUCTION - Add connection retry logic for orchestration platform health checks
```
**Action Required**: Optimize pool for containerized workloads with health checks

---

### 3. **Environment Configuration**
**File**: `backend/.env.example`

#### TODO #11-15: Environment & Database Setup (Line 4-17)
```
# TODO: PRODUCTION - Set NODE_ENV=production for production deployments
# TODO: PRODUCTION - Configure CORS_ORIGIN environment variable for proxy URL
# TODO: PRODUCTION - Use environment-specific credentials from secrets manager (AWS Secrets Manager, HashiCorp Vault)
# TODO: PRODUCTION - For Docker: Use database service DNS endpoint (e.g., db-service or postgres-container-name)
# TODO: PRODUCTION - For Kubernetes: Use service DNS (e.g., postgres.default.svc.cluster.local)
# TODO: PRODUCTION - Enable SSL_MODE=require for production database connections
```
**Action Required**: Use secrets management and configure environment-specific DNS

---

### 4. **Android App - API Configuration**
**File**: `android/app/src/main/java/com/visitormanagement/app/util/Constants.kt`

#### TODO #16-19: API Base URL Configuration (Line 11-14)
```kotlin
// TODO: PRODUCTION - Replace hardcoded IP with proxy URL (e.g., https://api.yourdomain.com/api/)
// TODO: PRODUCTION - Load BASE_URL from BuildConfig or remote configuration for environment-specific URLs
// TODO: PRODUCTION - Use HTTPS instead of HTTP for production (SSL/TLS certificate required)
// TODO: PRODUCTION - Implement certificate pinning for API security in production builds
```
**Action Required**: Replace IP with domain and use HTTPS

#### TODO #20-21: Shared Preferences (Line 43-44)
```kotlin
// TODO: PRODUCTION - Implement dynamic API URL configuration via Shared Preferences
// TODO: PRODUCTION - Allow configuration updates from admin dashboard without recompiling
```
**Action Required**: Enable dynamic URL configuration

---

### 5. **Retrofit HTTP Client**
**File**: `android/app/src/main/java/com/visitormanagement/app/data/api/RetrofitClient.kt`

#### TODO #22-24: Logging Configuration (Line 20-22)
```kotlin
// TODO: PRODUCTION - Disable verbose logging in production builds
// TODO: PRODUCTION - Use ProGuard/R8 to strip sensitive HTTP logs from release APKs
// TODO: PRODUCTION - Implement conditional logging based on BuildConfig.DEBUG
```
**Action Required**: Disable verbose HTTP logging in release builds

#### TODO #25-28: OkHttp Client Security (Line 30-33)
```kotlin
// TODO: PRODUCTION - Add certificate pinning for HTTPS security
// TODO: PRODUCTION - Implement request/response interceptors for authentication tokens
// TODO: PRODUCTION - Add network interceptor to handle proxy authentication if required
// TODO: PRODUCTION - Configure connection pool for containerized backend (adjust pool size for throughput)
```
**Action Required**: Implement security best practices for production

---

## SUMMARY BY CATEGORY

### 🐳 Docker & Container Configuration
- **5 TODOs**: Database pool sizing, health checks, readiness probes, service DNS
- **Files**: `server.js`, `config/database.js`

### 🌐 Reverse Proxy Configuration
- **3 TODOs**: CORS configuration, static file serving, Nginx setup
- **Files**: `server.js`, `.env.example`

### 🔒 Security & HTTPS
- **7 TODOs**: SSL certificates, certificate pinning, logging redaction, CORS whitelisting
- **Files**: `Constants.kt`, `RetrofitClient.kt`, `.env.example`

### 📊 Environment & Configuration
- **5 TODOs**: NODE_ENV, secrets management, DNS configuration, dynamic URLs
- **Files**: `.env.example`, `Constants.kt`

### 📡 Network & Communication
- **4 TODOs**: HTTP logging, interceptors, connection pooling, proxy authentication
- **Files**: `RetrofitClient.kt`

**Total: 28 TODO items** strategically placed for production readiness

---

## IMPLEMENTATION PRIORITY

### Phase 1: Essential (Do First)
1. Replace hardcoded IP with proxy domain (Constants.kt)
2. Set NODE_ENV=production (.env)
3. Configure CORS_ORIGIN (server.js + .env)
4. Enable HTTPS (Constants.kt + nginx.conf)
5. Use database service DNS (config/database.js + .env)

### Phase 2: Important (Do Early)
6. Disable verbose logging (RetrofitClient.kt)
7. Adjust database pool settings (config/database.js)
8. Add health check endpoints (server.js)
9. Implement secrets management (.env)
10. Configure readiness probes (server.js)

### Phase 3: Recommended (Do When Possible)
11. Add certificate pinning (RetrofitClient.kt)
12. Implement authentication tokens (RetrofitClient.kt)
13. Offload static files to Nginx/CDN (server.js)
14. Add connection retry logic (config/database.js)
15. Implement structured logging (server.js)

### Phase 4: Enhancement (Nice to Have)
16. Dynamic URL configuration via SharedPreferences (Constants.kt)
17. ProGuard/R8 optimization (RetrofitClient.kt)
18. Advanced proxy authentication (RetrofitClient.kt)

---

## QUICK DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All TODOs reviewed in priority order
- [ ] Environment file (.env) configured for production
- [ ] SSL certificates obtained and placed in ./ssl/
- [ ] Database backed up
- [ ] Android BuildConfig variants created for prod/dev

### Docker Setup
- [ ] Dockerfile created and tested
- [ ] docker-compose.yml configured with correct environment variables
- [ ] Nginx configuration with proper SSL paths
- [ ] Health checks configured for all services

### Application Configuration
- [ ] Constants.kt updated with production proxy URL
- [ ] server.js CORS configuration correct
- [ ] Database DNS endpoints updated
- [ ] Logging disabled in Android release builds

### Testing
- [ ] `docker-compose up -d` successful
- [ ] All containers running: `docker ps`
- [ ] Backend health check passing: `curl https://api.yourdomain.com/health`
- [ ] Database connectivity verified
- [ ] Android app connects and authenticates
- [ ] Proxy routing working correctly

### Monitoring
- [ ] Container logs accessible: `docker-compose logs -f`
- [ ] Health endpoints monitored
- [ ] Database connections monitored
- [ ] Error rates tracked
- [ ] Gradual traffic migration (if applicable)

---

## RELATED DOCUMENTATION

- `BACKEND_FRONTEND_SETUP.md` - Complete setup guide with commands
- `EXPLORATION_SUMMARY.md` - Architecture overview
- `CODEBASE_ANALYSIS.md` - Detailed technical breakdown
- `API_ENDPOINTS_REFERENCE.md` - All available endpoints

---

## Notes

- All TODOs are marked with `// TODO: PRODUCTION` for easy searching with `grep`
- No code was changed, only TODOs added to guide implementation
- Search for `TODO: PRODUCTION` across codebase to find all items:
  ```bash
  grep -r "TODO: PRODUCTION" /Users/andreiiacob/visitor-management-app/
  ```

