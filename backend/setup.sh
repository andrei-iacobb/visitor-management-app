#!/bin/bash

# Visitor Management System - Setup Script
# This script helps set up the backend environment

set -e  # Exit on error

echo "========================================="
echo "Visitor Management System - Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm $(npm --version) found"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client (psql) not found in PATH"
    print_info "You'll need to set up the database manually"
else
    print_success "PostgreSQL client found"
fi

echo ""
echo "========================================="
echo "Step 1: Installing Dependencies"
echo "========================================="
echo ""

npm install

print_success "Dependencies installed"

echo ""
echo "========================================="
echo "Step 2: Environment Configuration"
echo "========================================="
echo ""

if [ -f ".env" ]; then
    print_warning ".env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing .env file"
    else
        cp .env.example .env
        print_success ".env file created from template"
    fi
else
    cp .env.example .env
    print_success ".env file created from template"
fi

echo ""
echo "========================================="
echo "Step 3: Database Setup"
echo "========================================="
echo ""

print_info "Database configuration:"
read -p "Enter PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Enter database name (default: visitor_management): " DB_NAME
DB_NAME=${DB_NAME:-visitor_management}

read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""

# Update .env file
sed -i.bak "s/DB_HOST=.*/DB_HOST=$DB_HOST/" .env
sed -i.bak "s/DB_PORT=.*/DB_PORT=$DB_PORT/" .env
sed -i.bak "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
sed -i.bak "s/DB_USER=.*/DB_USER=$DB_USER/" .env
sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
rm .env.bak

print_success "Database configuration saved to .env"

echo ""
read -p "Do you want to create the database now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating database..."

    # Check if database exists
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        print_warning "Database '$DB_NAME' already exists"
    else
        PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
        print_success "Database '$DB_NAME' created"
    fi

    print_info "Running database schema..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql
    print_success "Database schema applied"
else
    print_info "Skipping database creation"
    print_warning "You'll need to run these commands manually:"
    echo "  createdb $DB_NAME"
    echo "  psql -U $DB_USER -d $DB_NAME -f database/schema.sql"
fi

echo ""
echo "========================================="
echo "Step 4: SharePoint Integration (Optional)"
echo "========================================="
echo ""

read -p "Do you want to configure SharePoint integration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "SharePoint configuration:"

    read -p "Azure Tenant ID: " AZURE_TENANT_ID
    read -p "Azure Client ID: " AZURE_CLIENT_ID
    read -sp "Azure Client Secret: " AZURE_CLIENT_SECRET
    echo ""
    read -p "SharePoint Site ID: " SHAREPOINT_SITE_ID
    read -p "SharePoint Drive ID: " SHAREPOINT_DRIVE_ID
    read -p "Excel File Path (e.g., /VisitorManagement/SignIns.xlsx): " EXCEL_FILE_PATH

    # Update .env file
    sed -i.bak "s/ENABLE_SHAREPOINT=.*/ENABLE_SHAREPOINT=true/" .env
    sed -i.bak "s/AZURE_TENANT_ID=.*/AZURE_TENANT_ID=$AZURE_TENANT_ID/" .env
    sed -i.bak "s/AZURE_CLIENT_ID=.*/AZURE_CLIENT_ID=$AZURE_CLIENT_ID/" .env
    sed -i.bak "s/AZURE_CLIENT_SECRET=.*/AZURE_CLIENT_SECRET=$AZURE_CLIENT_SECRET/" .env
    sed -i.bak "s|SHAREPOINT_SITE_ID=.*|SHAREPOINT_SITE_ID=$SHAREPOINT_SITE_ID|" .env
    sed -i.bak "s|SHAREPOINT_DRIVE_ID=.*|SHAREPOINT_DRIVE_ID=$SHAREPOINT_DRIVE_ID|" .env
    sed -i.bak "s|EXCEL_FILE_PATH=.*|EXCEL_FILE_PATH=$EXCEL_FILE_PATH|" .env
    rm .env.bak

    print_success "SharePoint configuration saved"
else
    print_info "SharePoint integration disabled"
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
print_success "Backend setup completed successfully"
echo ""
print_info "Next steps:"
echo "  1. Review and adjust settings in .env file if needed"
echo "  2. Start the development server: npm run dev"
echo "  3. Or start in production mode: npm start"
echo "  4. Test the API: npm test"
echo ""
print_info "Server will run on: http://localhost:3000"
print_info "API Documentation: See README.md and API_DOCUMENTATION.md"
print_info "SharePoint Setup: See SHAREPOINT_SETUP.md"
echo ""
print_warning "Security Note: Never commit your .env file to version control!"
echo ""

read -p "Do you want to start the server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting server..."
    npm start
else
    print_info "Setup complete! Run 'npm start' when you're ready."
fi
