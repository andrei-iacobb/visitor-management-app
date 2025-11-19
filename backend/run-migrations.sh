#!/bin/bash

echo "Running database migrations..."

# Get database URL from .env
cd /home/user/visitor-management-app/backend
DATABASE_URL=$(node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL);")

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env"
    exit 1
fi

echo "Database: $DATABASE_URL"
echo ""
echo "Applying migration: 001_add_vehicle_details.sql"
psql "$DATABASE_URL" -f database/migrations/001_add_vehicle_details.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "New columns added to vehicles table:"
    echo "  - make (VARCHAR)"
    echo "  - model (VARCHAR)"
    echo "  - year (INTEGER)"
    echo "  - notes (TEXT)"
else
    echo ""
    echo "❌ Migration failed. Check if PostgreSQL is running."
    exit 1
fi
