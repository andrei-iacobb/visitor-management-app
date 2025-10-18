# cURL Examples for Testing API

Quick reference for testing all API endpoints using cURL.

## Health Check

```bash
curl http://localhost:3000/health
```

## Sign-In Operations

### 1. Create a New Sign-In (Visitor)

```bash
curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john.doe@example.com",
    "company_name": "ACME Corporation",
    "purpose_of_visit": "Business meeting with sales team",
    "car_registration": "ABC123",
    "visiting_person": "Jane Smith"
  }'
```

### 2. Create a New Sign-In (Contractor)

```bash
curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "contractor",
    "full_name": "Mike Johnson",
    "phone_number": "+1987654321",
    "email": "mike@contractors.com",
    "company_name": "Johnson Contractors Ltd",
    "purpose_of_visit": "HVAC maintenance and inspection",
    "car_registration": "XYZ789",
    "visiting_person": "Facilities Manager"
  }'
```

### 3. Get All Sign-Ins (with pagination)

```bash
curl "http://localhost:3000/api/sign-ins?limit=10&offset=0"
```

### 4. Get Sign-Ins Filtered by Status (Active Only)

```bash
curl "http://localhost:3000/api/sign-ins?status=signed_in&limit=50"
```

### 5. Get Sign-Ins Filtered by Type (Contractors Only)

```bash
curl "http://localhost:3000/api/sign-ins?visitor_type=contractor"
```

### 6. Get Active Visitors

```bash
curl http://localhost:3000/api/sign-ins/status/active
```

### 7. Get Single Sign-In by ID

```bash
curl http://localhost:3000/api/sign-ins/1
```

### 8. Sign Out a Visitor

```bash
curl -X PUT http://localhost:3000/api/sign-ins/1/sign-out
```

### 9. Delete a Sign-In Record

```bash
curl -X DELETE http://localhost:3000/api/sign-ins/1
```

## Staff Operations

### 1. Get All Staff Members

```bash
curl http://localhost:3000/api/staff
```

### 2. Get Single Staff Member

```bash
curl http://localhost:3000/api/staff/1
```

### 3. Create a New Staff Member

```bash
curl -X POST http://localhost:3000/api/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Williams",
    "email": "sarah.williams@company.com",
    "department": "Human Resources"
  }'
```

### 4. Update a Staff Member

```bash
curl -X PUT http://localhost:3000/api/staff/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Williams",
    "email": "sarah.williams@company.com",
    "department": "Operations"
  }'
```

### 5. Delete a Staff Member

```bash
curl -X DELETE http://localhost:3000/api/staff/1
```

## SharePoint Operations

### 1. Check SharePoint Integration Status

```bash
curl http://localhost:3000/api/sharepoint/status
```

### 2. Sync All Unsynced Records to SharePoint

```bash
curl -X POST http://localhost:3000/api/sharepoint/sync
```

### 3. Sync Specific Record to SharePoint

```bash
curl -X POST http://localhost:3000/api/sharepoint/sync/1
```

### 4. Read Data from SharePoint

```bash
curl http://localhost:3000/api/sharepoint/read
```

## Testing Error Handling

### 1. Test Validation Errors

```bash
# Missing required fields
curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "invalid_type",
    "full_name": "A"
  }'
```

### 2. Test 404 Not Found

```bash
curl http://localhost:3000/api/sign-ins/99999
```

### 3. Test Duplicate Email (Staff)

```bash
# Create first staff member
curl -X POST http://localhost:3000/api/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "duplicate@test.com",
    "department": "IT"
  }'

# Try to create another with same email
curl -X POST http://localhost:3000/api/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another User",
    "email": "duplicate@test.com",
    "department": "HR"
  }'
```

## Advanced Query Examples

### 1. Get Recently Signed-In Visitors (Last 5)

```bash
curl "http://localhost:3000/api/sign-ins?limit=5&offset=0"
```

### 2. Get All Signed-Out Contractors

```bash
curl "http://localhost:3000/api/sign-ins?status=signed_out&visitor_type=contractor"
```

### 3. Pagination - Get Next Page

```bash
# First page
curl "http://localhost:3000/api/sign-ins?limit=10&offset=0"

# Second page
curl "http://localhost:3000/api/sign-ins?limit=10&offset=10"

# Third page
curl "http://localhost:3000/api/sign-ins?limit=10&offset=20"
```

## Pretty Print JSON Output

Add `| jq` to any curl command to format JSON output (requires jq installed):

```bash
curl http://localhost:3000/api/sign-ins/status/active | jq
```

## Save Response to File

```bash
curl http://localhost:3000/api/sign-ins > sign-ins.json
```

## Include HTTP Headers in Output

```bash
curl -i http://localhost:3000/api/sign-ins
```

## Verbose Output (for debugging)

```bash
curl -v http://localhost:3000/api/sign-ins
```

## Complete Workflow Example

```bash
# 1. Create a staff member
curl -X POST http://localhost:3000/api/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reception Desk",
    "email": "reception@company.com",
    "department": "Front Office"
  }'

# 2. Create a visitor sign-in
SIGNIN_ID=$(curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "visitor",
    "full_name": "Alice Cooper",
    "phone_number": "+1555123456",
    "email": "alice@example.com",
    "purpose_of_visit": "Interview",
    "visiting_person": "Reception Desk"
  }' | jq -r '.data.id')

echo "Created sign-in with ID: $SIGNIN_ID"

# 3. Check active visitors
curl http://localhost:3000/api/sign-ins/status/active | jq

# 4. Sign out the visitor
curl -X PUT "http://localhost:3000/api/sign-ins/$SIGNIN_ID/sign-out" | jq

# 5. Verify sign-out
curl "http://localhost:3000/api/sign-ins/$SIGNIN_ID" | jq
```

## Batch Operations Script

Create a file `test-batch.sh`:

```bash
#!/bin/bash

echo "Creating multiple sign-ins..."

for i in {1..5}; do
  curl -X POST http://localhost:3000/api/sign-ins \
    -H "Content-Type: application/json" \
    -d "{
      \"visitor_type\": \"visitor\",
      \"full_name\": \"Test Visitor $i\",
      \"phone_number\": \"+155512300$i\",
      \"email\": \"visitor$i@test.com\",
      \"purpose_of_visit\": \"Testing\",
      \"visiting_person\": \"Admin\"
    }"
  echo ""
done

echo "Done! Check active visitors:"
curl http://localhost:3000/api/sign-ins/status/active | jq
```

Make it executable:
```bash
chmod +x test-batch.sh
./test-batch.sh
```

## Performance Testing

Test API response time:

```bash
time curl http://localhost:3000/api/sign-ins
```

## Notes

- Replace `localhost:3000` with your server address if different
- Ensure the server is running before testing
- Install `jq` for better JSON formatting: `brew install jq` (macOS) or `apt-get install jq` (Linux)
- Use `-s` flag for silent mode (no progress bar): `curl -s http://...`
