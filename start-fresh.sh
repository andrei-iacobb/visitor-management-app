#!/bin/bash

echo "==================================="
echo "FRESH START - VISITOR MANAGEMENT"
echo "==================================="

# Kill any existing Node processes
echo "1. Killing any existing Node servers..."
pkill -9 node 2>/dev/null || true
sleep 2

# Navigate to backend
cd /home/user/visitor-management-app/backend

# Start the server
echo "2. Starting server..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "3. Waiting for server to start..."
sleep 5

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running on PID $SERVER_PID"
    echo ""
    echo "==================================="
    echo "✅ SERVER STARTED SUCCESSFULLY"
    echo "==================================="
    echo ""
    echo "Open your browser and go to:"
    echo ""
    echo "    http://localhost:3000/index.html"
    echo ""
    echo "Login with:"
    echo "    Username: admin"
    echo "    Password: admin123"
    echo ""
    echo "You should see a BIG PURPLE CARD at the top with SharePoint sync buttons"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "==================================="
    wait $SERVER_PID
else
    echo "❌ Server failed to start"
    exit 1
fi
