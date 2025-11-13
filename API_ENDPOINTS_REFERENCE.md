# Visitor Management System - Complete API Reference

## Base URL
```
http://[SERVER_IP]:3000/api/
```

**Default Configuration**: `http://localhost:3000/api/`
**Current Android Config**: `http://192.168.1.48:3000/api/`

---

## Health & Status

### Health Check
```http
GET /health
```

**Response**:
```json
{
  "success": true,
  "message": "Visitor Management API is running",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 45.123
}
```

### Root Endpoint
```http
GET /
```

Returns API information and available endpoints list.

---

## Sign-In Management

### Create Sign-In
```http
POST /api/sign-ins
Content-Type: application/json
```

**Request Body**:
```json
{
  "visitor_type": "visitor",          // Required: "visitor" or "contractor"
  "full_name": "John Doe",            // Required: 2-255 chars
  "phone_number": "+1234567890",      // Required: 5-50 chars
  "email": "john@example.com",        // Optional: valid email format
  "company_name": "ACME Corp",        // Optional: max 255 chars
  "purpose_of_visit": "Meeting",      // Required: min 3 chars
  "car_registration": "ABC123",       // Optional: max 50 chars
  "visiting_person": "Jane Smith",    // Required: 2-255 chars
  "document_acknowledged": true,      // Optional: boolean
  "document_acknowledgment_time": "2025-01-15T10:30:00Z"  // Optional: ISO timestamp
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Sign-in created successfully",
  "data": {
    "id": 1,
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com",
    "company_name": "ACME Corp",
    "purpose_of_visit": "Meeting",
    "car_registration": "ABC123",
    "visiting_person": "Jane Smith",
    "document_acknowledged": true,
    "document_acknowledgment_time": "2025-01-15T10:30:00Z",
    "sign_in_time": "2025-01-15T10:30:00Z",
    "sign_out_time": null,
    "status": "signed_in",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

---

### Get All Sign-Ins
```http
GET /api/sign-ins?status=signed_in&visitor_type=visitor&limit=50&offset=0
```

**Query Parameters**:
- `status` (optional): "signed_in" or "signed_out"
- `visitor_type` (optional): "visitor" or "contractor"
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Starting record (default: 0)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sign-ins retrieved successfully",
  "data": [
    { /* sign-in object */ },
    { /* sign-in object */ }
  ]
}
```

---

### Get Active Visitors
```http
GET /api/sign-ins/status/active
```

Returns only visitors with `status: "signed_in"`.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Active visitors retrieved successfully",
  "data": [
    {
      "id": 1,
      "visitor_type": "visitor",
      "full_name": "John Doe",
      "sign_in_time": "2025-01-15T10:30:00Z",
      "status": "signed_in"
      // ... more fields
    }
  ]
}
```

---

### Get Single Sign-In
```http
GET /api/sign-ins/{id}
```

**URL Parameters**:
- `id`: Sign-in record ID (integer)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sign-in retrieved successfully",
  "data": { /* sign-in object */ }
}
```

**Error (404 Not Found)**:
```json
{
  "success": false,
  "message": "Sign-in not found"
}
```

---

### Sign Out Visitor
```http
PUT /api/sign-ins/{id}/sign-out
```

**URL Parameters**:
- `id`: Sign-in record ID (integer)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sign-out successful",
  "data": {
    "id": 1,
    "status": "signed_out",
    "sign_out_time": "2025-01-15T11:00:00Z",
    // ... other fields
  }
}
```

---

### Delete Sign-In
```http
DELETE /api/sign-ins/{id}
```

**URL Parameters**:
- `id`: Sign-in record ID (integer)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sign-in deleted successfully",
  "data": { /* deleted sign-in object */ }
}
```

---

## Staff Management

### Get All Staff
```http
GET /api/staff?limit=50&offset=0
```

**Query Parameters**:
- `limit` (optional): Number of records
- `offset` (optional): Starting record

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Staff members retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Jane Smith",
      "email": "jane@company.com",
      "department": "HR",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### Create Staff Member
```http
POST /api/staff
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Jane Smith",           // Required: 2-255 chars
  "email": "jane@company.com",    // Required: unique, valid email
  "department": "HR"              // Required: department name
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@company.com",
    "department": "HR",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Error (409 Conflict)** - Duplicate email:
```json
{
  "success": false,
  "message": "Duplicate entry",
  "error": "Key (email)=(jane@company.com) already exists."
}
```

---

### Get Single Staff Member
```http
GET /api/staff/{id}
```

**Response (200 OK)**: Staff member object

---

### Update Staff Member
```http
PUT /api/staff/{id}
Content-Type: application/json
```

**Request Body**: Same as create (all fields optional for update)
```json
{
  "name": "Jane Smith",
  "email": "jane.new@company.com",
  "department": "Operations"
}
```

**Response (200 OK)**: Updated staff object

---

### Delete Staff Member
```http
DELETE /api/staff/{id}
```

**Response (200 OK)**: Deleted staff object

---

## Contractor Verification

### Verify Contractor
```http
POST /api/contractors/verify
Content-Type: application/json
```

**Request Body**:
```json
{
  "contractor_name": "Mike Johnson",
  "company_name": "Johnson Contractors Ltd"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Contractor verification successful",
  "data": {
    "is_approved": true,
    "contractor_id": 1,
    "contractor_name": "Mike Johnson",
    "approval_date": "2025-01-15T10:30:00Z"
  }
}
```

---

### Get Approved Contractors
```http
GET /api/contractors/approved?limit=50&offset=0
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Approved contractors retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Mike Johnson",
      "company": "Johnson Contractors Ltd",
      "approval_status": "approved",
      "approval_date": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### Add Contractor to Whitelist
```http
POST /api/contractors
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Mike Johnson",
  "company": "Johnson Contractors Ltd",
  "trade": "HVAC",
  "approval_date": "2025-01-15T10:30:00Z"
}
```

**Response (201 Created)**: Contractor object

---

### Update Contractor Status
```http
PUT /api/contractors/{id}
Content-Type: application/json
```

**Request Body**:
```json
{
  "approval_status": "approved"  // or "rejected"
}
```

**Response (200 OK)**: Updated contractor object

---

## Vehicle Management

### Check Vehicle Status
```http
GET /api/vehicles/{registration}
```

**URL Parameters**:
- `registration`: Vehicle registration plate (e.g., "ABC123")

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Vehicle status retrieved successfully",
  "data": {
    "registration": "ABC123",
    "status": "checked_in",
    "last_checkout_date": "2025-01-15T09:00:00Z",
    "last_checkin_date": "2025-01-15T17:00:00Z",
    "current_driver": null,
    "fuel_level": 85
  }
}
```

---

### Vehicle Checkout
```http
POST /api/vehicles/checkout
Content-Type: application/json
```

**Request Body**:
```json
{
  "registration": "ABC123",       // Required: vehicle registration
  "driver_name": "John Doe",      // Required: driver name
  "fuel_level": 85,               // Optional: fuel level percentage
  "odometer_reading": 50000,      // Optional: odometer km
  "destination": "Site A"         // Optional: destination
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Vehicle checked out successfully",
  "data": {
    "id": 1,
    "registration": "ABC123",
    "driver_name": "John Doe",
    "checkout_time": "2025-01-15T09:00:00Z",
    "fuel_level": 85,
    "status": "checked_out"
  }
}
```

---

### Vehicle Checkin
```http
POST /api/vehicles/checkin
Content-Type: application/json
```

**Request Body**:
```json
{
  "registration": "ABC123",
  "fuel_level": 75,
  "odometer_reading": 50050,
  "notes": "No issues"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Vehicle checked in successfully",
  "data": {
    "id": 1,
    "registration": "ABC123",
    "checkin_time": "2025-01-15T17:00:00Z",
    "fuel_level": 75,
    "status": "checked_in"
  }
}
```

---

### Report Vehicle Damage
```http
POST /api/vehicles/damage
Content-Type: application/json
```

**Request Body**:
```json
{
  "registration": "ABC123",
  "damage_description": "Scratch on left side",
  "severity": "minor",            // "minor", "moderate", "severe"
  "reported_by": "John Doe",
  "damage_photo": "base64_encoded_image"  // Optional
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Damage report submitted successfully",
  "data": {
    "id": 1,
    "registration": "ABC123",
    "damage_description": "Scratch on left side",
    "severity": "minor",
    "report_date": "2025-01-15T10:30:00Z",
    "status": "reported"
  }
}
```

---

## Document Management

### List Available Documents
```http
GET /api/documents/list
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Documents listed successfully",
  "data": [
    {
      "fileName": "visitor_agreement.pdf",
      "fileSize": 102400,
      "uploadDate": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### Download Document
```http
GET /api/documents/{fileName}
```

**URL Parameters**:
- `fileName`: Document filename (e.g., "visitor_agreement.pdf")

**Response (200 OK)**:
- Returns file content with appropriate Content-Type header
- Binary data (PDF, image, etc.)

---

## SharePoint Integration

### Sync to SharePoint
```http
POST /api/sharepoint/sync
```

Syncs all unsynced sign-in records to SharePoint Excel file.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Records synced to SharePoint successfully",
  "data": {
    "records_synced": 5,
    "sync_timestamp": "2025-01-15T10:30:00Z"
  }
}
```

---

### Read from SharePoint
```http
GET /api/sharepoint/read
```

Reads visitor data from SharePoint Excel file.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Data read from SharePoint successfully",
  "data": {
    "records_count": 150,
    "last_sync": "2025-01-15T10:30:00Z"
  }
}
```

---

## Error Responses

### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "value": "invalid",
      "msg": "Visitor type must be either \"visitor\" or \"contractor\"",
      "param": "visitor_type",
      "location": "body"
    }
  ]
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Route not found",
  "path": "/api/invalid",
  "method": "GET"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Request Headers

All requests should include:
```http
Content-Type: application/json
```

Optional headers:
```http
Authorization: Bearer <token>  (when authentication is enabled)
```

---

## Response Headers

Standard response headers:
```http
Content-Type: application/json; charset=utf-8
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

---

## Pagination

For endpoints supporting pagination:

```http
GET /api/sign-ins?limit=10&offset=20
```

- `limit`: Number of records per page (default: 50)
- `offset`: Number of records to skip (default: 0)

Example: 
- First page: `?limit=10&offset=0`
- Second page: `?limit=10&offset=10`
- Third page: `?limit=10&offset=20`

---

## Data Types

### Field Types
- `string`: Text data
- `integer`: Whole numbers
- `boolean`: true/false
- `timestamp`: ISO 8601 format (e.g., "2025-01-15T10:30:00Z")
- `base64`: Base64 encoded data (photos, signatures)

### Enums
- `visitor_type`: "visitor" | "contractor"
- `status`: "signed_in" | "signed_out"
- `severity`: "minor" | "moderate" | "severe"

---

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 500 | Internal Error | Server error |

---

## Rate Limiting

Currently not implemented. All endpoints accept unlimited requests.

---

## Testing All Endpoints

See `backend/CURL_EXAMPLES.md` for complete cURL examples for every endpoint.

