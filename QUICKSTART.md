# Quick Start Guide

Get your Visitor Management System up and running in 5 minutes.

## Prerequisites Checklist

- [ ] Node.js v14+ installed ([Download](https://nodejs.org/))
- [ ] PostgreSQL v12+ installed and running ([Download](https://www.postgresql.org/download/))
- [ ] Git (for cloning)

## Quick Setup (3 Steps)

### Step 1: Navigate to Backend Directory

```bash
cd visitor-management-app/backend
```

### Step 2: Run Setup Script (Automated)

```bash
chmod +x setup.sh
./setup.sh
```

The script will:
- Install all npm dependencies
- Create `.env` file from template
- Guide you through database configuration
- Set up the PostgreSQL database
- Optionally configure SharePoint integration

### Step 3: Start the Server

```bash
npm start
```

That's it! Your API is now running at `http://localhost:3000`

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Set Up Database

```bash
# Create database
createdb visitor_management

# Run schema
psql -U postgres -d visitor_management -f database/schema.sql
```

### 4. Update .env File

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_management
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 5. Start Server

```bash
npm start
```

## Verify Installation

### 1. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Visitor Management API is running",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 12.345
}
```

### 2. Run Test Suite

```bash
# In a new terminal (keep server running)
npm test
```

### 3. Create First Sign-In

```bash
curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "purpose_of_visit": "Meeting",
    "visiting_person": "Jane Smith"
  }'
```

### 4. View Active Visitors

```bash
curl http://localhost:3000/api/sign-ins/status/active
```

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Common Issues & Solutions

### Issue: Port 3000 Already in Use

**Solution:** Kill the process or change the port

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Issue: Database Connection Failed

**Solution:** Check PostgreSQL is running

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

### Issue: Cannot Create Database

**Solution:** Check PostgreSQL user permissions

```bash
# Connect as postgres superuser
psql -U postgres

# Create user with permissions
CREATE USER your_user WITH PASSWORD 'your_password';
ALTER USER your_user CREATEDB;
```

### Issue: Module Not Found

**Solution:** Reinstall dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

### 1. Explore the API

- Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference
- Try examples in [CURL_EXAMPLES.md](./backend/CURL_EXAMPLES.md)
- Use the test suite as reference: `backend/tests/api-test.js`

### 2. Configure SharePoint (Optional)

- Follow [SHAREPOINT_SETUP.md](./SHAREPOINT_SETUP.md) for detailed instructions
- Test SharePoint integration:
  ```bash
  curl http://localhost:3000/api/sharepoint/status
  ```

### 3. Build Android App

- Navigate to android directory (to be implemented)
- Follow Android setup instructions
- Configure API base URL to point to your backend

### 4. Customize

- Modify database schema in `backend/database/schema.sql`
- Add custom validation in route files
- Extend API with new endpoints
- Customize Excel export format

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=strong-password
```

### Security Checklist

- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Implement authentication
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Use connection pooling
- [ ] Enable request logging
- [ ] Regular security updates

### Performance Tips

- [ ] Use database indexes (already included)
- [ ] Enable gzip compression
- [ ] Set up caching
- [ ] Monitor memory usage
- [ ] Use PM2 for process management
- [ ] Set up load balancing if needed

## Project Structure Overview

```
backend/
├── config/
│   └── database.js          # DB connection config
├── routes/
│   ├── signInRoutes.js      # Sign-in endpoints
│   ├── staffRoutes.js       # Staff endpoints
│   └── sharepointRoutes.js  # SharePoint endpoints
├── services/
│   └── sharepointService.js # SharePoint logic
├── database/
│   └── schema.sql           # Database schema
├── tests/
│   └── api-test.js          # Test suite
├── server.js                # Main server file
└── .env                     # Configuration (create this)
```

## Useful Commands

```bash
# Development
npm run dev              # Start with auto-reload
npm test                 # Run test suite
npm start                # Start production server

# Database
psql -U postgres -d visitor_management  # Connect to DB
psql -U postgres -d visitor_management -f database/schema.sql  # Run schema

# Logs
tail -f logs/access.log  # View access logs (if configured)

# Process Management
pm2 start server.js --name visitor-api  # Start with PM2
pm2 logs visitor-api     # View PM2 logs
pm2 restart visitor-api  # Restart server
```

## Getting Help

- **Documentation**: Check README.md and API_DOCUMENTATION.md
- **Examples**: See CURL_EXAMPLES.md for API usage
- **SharePoint**: Follow SHAREPOINT_SETUP.md step-by-step
- **Issues**: Check logs and error messages
- **Testing**: Run `npm test` to verify everything works

## What's Next?

1. **Basic Usage**: Test all endpoints using the test suite or cURL examples
2. **Android App**: Build the mobile frontend (to be implemented)
3. **Customization**: Adapt the system to your specific needs
4. **Production**: Deploy to your server with proper security
5. **Monitoring**: Set up logging and monitoring tools

---

**Ready to build something awesome!** Start by testing the API endpoints and exploring the documentation.
