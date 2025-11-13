#!/bin/bash

# VISITOR MANAGEMENT SYSTEM - QUICK START COMMANDS
# This script contains all commands needed for backend-frontend communication

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║ Visitor Management System - Backend & Frontend Setup Guide   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# DEVELOPMENT SETUP
# ============================================================

echo "📋 DEVELOPMENT SETUP"
echo "─────────────────────────────────────────────────────────────────"
echo ""

echo "1️⃣  INSTALL BACKEND DEPENDENCIES"
echo "   cd backend && npm install"
echo ""

echo "2️⃣  DATABASE SETUP (PostgreSQL)"
echo "   # Start PostgreSQL service"
echo "   # macOS: brew services start postgresql"
echo "   # Ubuntu: sudo systemctl start postgresql"
echo ""
echo "   # Create database and user"
echo "   psql -U postgres -c \"CREATE DATABASE visitor_management;\""
echo "   psql -U postgres -c \"CREATE USER visitor_admin WITH PASSWORD 'visitor_pass_123';\""
echo "   psql -U postgres -c \"GRANT ALL PRIVILEGES ON DATABASE visitor_management TO visitor_admin;\""
echo ""

echo "3️⃣  START BACKEND SERVER (Development)"
echo "   cd backend"
echo "   npm install -g nodemon"
echo "   nodemon server.js"
echo "   # Server: http://localhost:3000"
echo "   # Health check: http://localhost:3000/health"
echo ""

echo "4️⃣  UPDATE ANDROID APP API URL"
echo "   File: android/app/src/main/java/com/visitormanagement/app/util/Constants.kt"
echo "   Line 11: Replace 192.168.1.48 with your backend IP"
echo "   const val BASE_URL = \"http://<YOUR_IP>:3000/api/\""
echo ""

echo "5️⃣  BUILD & DEPLOY ANDROID APK"
echo "   cd android"
echo "   ./gradlew assembleDebug"
echo "   adb install -r app/build/outputs/apk/debug/app-debug.apk"
echo "   adb shell am start -n com.visitormanagement.app/.ui.main.MainActivity"
echo ""

echo "6️⃣  VERIFY COMMUNICATION"
echo "   curl http://localhost:3000/health"
echo "   curl http://localhost:3000/api/sign-ins"
echo ""

# ============================================================
# PRODUCTION SETUP (DOCKER)
# ============================================================

echo ""
echo "🐳 PRODUCTION SETUP (DOCKER & REVERSE PROXY)"
echo "─────────────────────────────────────────────────────────────────"
echo ""

echo "1️⃣  VERIFY DOCKER INSTALLATION"
echo "   docker --version"
echo "   docker-compose --version"
echo ""

echo "2️⃣  CREATE DOCKERFILE (backend/Dockerfile)"
echo "   See BACKEND_FRONTEND_SETUP.md for full content"
echo ""

echo "3️⃣  CREATE docker-compose.yml"
echo "   See BACKEND_FRONTEND_SETUP.md for full content"
echo ""

echo "4️⃣  CREATE NGINX CONFIGURATION (nginx.conf)"
echo "   See BACKEND_FRONTEND_SETUP.md for full content"
echo ""

echo "5️⃣  CREATE .env FILE FOR PRODUCTION"
echo "   cp backend/.env.example backend/.env"
echo "   Edit backend/.env with production settings:"
echo "     NODE_ENV=production"
echo "     DB_HOST=postgres"
echo "     DB_PASSWORD=<secure_password>"
echo "     CORS_ORIGIN=https://api.yourdomain.com"
echo ""

echo "6️⃣  ADD SSL CERTIFICATES"
echo "   mkdir -p ssl"
echo "   # Place your SSL certificates in ssl/ directory"
echo "   # cert.pem and key.pem"
echo ""

echo "7️⃣  START ALL SERVICES"
echo "   docker-compose up -d"
echo ""

echo "8️⃣  VERIFY CONTAINERS"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
echo ""

echo "9️⃣  TEST COMMUNICATION"
echo "   curl https://api.yourdomain.com/health"
echo "   curl https://api.yourdomain.com/api/sign-ins"
echo ""

echo "🔟 UPDATE ANDROID FOR PRODUCTION"
echo "   File: android/app/src/main/java/com/visitormanagement/app/util/Constants.kt"
echo "   const val BASE_URL = \"https://api.yourdomain.com/api/\""
echo ""

# ============================================================
# USEFUL COMMANDS
# ============================================================

echo ""
echo "🛠️  USEFUL COMMANDS"
echo "─────────────────────────────────────────────────────────────────"
echo ""

echo "View backend logs:"
echo "  docker-compose logs visitor-api -f"
echo ""

echo "View database logs:"
echo "  docker-compose logs postgres -f"
echo ""

echo "View proxy logs:"
echo "  docker-compose logs nginx -f"
echo ""

echo "Stop all services:"
echo "  docker-compose down"
echo ""

echo "Rebuild containers after code changes:"
echo "  docker-compose up -d --build"
echo ""

echo "Execute command in container:"
echo "  docker-compose exec visitor-api curl http://localhost:3000/health"
echo ""

echo "Rebuild Android app (release):"
echo "  cd android && ./gradlew assembleRelease"
echo ""

echo "Check database:"
echo "  docker-compose exec postgres psql -U visitor_admin -d visitor_management -c \"SELECT * FROM sign_ins;\""
echo ""

# ============================================================
# TROUBLESHOOTING
# ============================================================

echo ""
echo "🔧 TROUBLESHOOTING"
echo "─────────────────────────────────────────────────────────────────"
echo ""

echo "❌ Backend won't start"
echo "   1. Check Node.js: node --version"
echo "   2. Install dependencies: npm install"
echo "   3. Check port 3000 is free: lsof -i :3000"
echo "   4. Check database is running: psql -U postgres -c \"SELECT version();\""
echo ""

echo "❌ Android can't connect to backend"
echo "   1. Check IP in Constants.kt (use 10.0.2.2 for emulator)"
echo "   2. Check backend running: curl http://localhost:3000/health"
echo "   3. Check firewall allows port 3000"
echo "   4. Rebuild app: ./gradlew assembleDebug"
echo ""

echo "❌ Docker container exits immediately"
echo "   1. Check logs: docker-compose logs visitor-api"
echo "   2. Check database is ready: docker-compose logs postgres"
echo "   3. Verify .env file exists and is correct"
echo ""

echo "❌ Nginx can't reach backend"
echo "   1. Test config: docker-compose exec nginx nginx -t"
echo "   2. Check health: docker-compose exec nginx curl http://visitor-api:3000/health"
echo "   3. Verify docker-compose.yml networking configuration"
echo ""

# ============================================================
# PRODUCTION CHECKLIST
# ============================================================

echo ""
echo "✅ PRODUCTION DEPLOYMENT CHECKLIST"
echo "─────────────────────────────────────────────────────────────────"
echo ""

echo "Pre-Deployment:"
echo "  ☐ Review all PRODUCTION TODOs (grep -r 'TODO: PRODUCTION' .)"
echo "  ☐ Update .env with production values"
echo "  ☐ Obtain SSL certificates"
echo "  ☐ Update Constants.kt with proxy domain"
echo "  ☐ Test database backup/restore"
echo ""

echo "Docker Setup:"
echo "  ☐ Create Dockerfile"
echo "  ☐ Create docker-compose.yml"
echo "  ☐ Create nginx.conf with SSL paths"
echo "  ☐ Test locally with docker-compose"
echo ""

echo "Application:"
echo "  ☐ Verify CORS settings"
echo "  ☐ Verify database pool configuration"
echo "  ☐ Verify logging is not verbose"
echo "  ☐ Build release APK with production URL"
echo ""

echo "Testing:"
echo "  ☐ All containers start successfully"
echo "  ☐ Health endpoints responding"
echo "  ☐ Database connections working"
echo "  ☐ Proxy routing correctly"
echo "  ☐ Android app connects and authenticates"
echo "  ☐ API endpoints returning data"
echo ""

echo "Monitoring:"
echo "  ☐ Logs accessible and reviewed"
echo "  ☐ Health checks configured"
echo "  ☐ Performance baseline established"
echo "  ☐ Error handling tested"
echo ""

echo ""
echo "📚 DOCUMENTATION FILES"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "  • BACKEND_FRONTEND_SETUP.md - Complete setup guide"
echo "  • PRODUCTION_TODOS_SUMMARY.md - All TODO items catalogued"
echo "  • QUICK_START_COMMANDS.sh - This file"
echo "  • EXPLORATION_SUMMARY.md - Architecture overview"
echo "  • CODEBASE_ANALYSIS.md - Technical details"
echo "  • API_ENDPOINTS_REFERENCE.md - All API endpoints"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "For detailed information, see BACKEND_FRONTEND_SETUP.md"
echo "═════════════════════════════════════════════════════════════════"
