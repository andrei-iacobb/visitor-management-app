# Visitor Management System - API Documentation

Complete API reference with examples and response formats.

## Base URL

```
http://localhost:3000/api
```

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Sign-In Endpoints](#sign-in-endpoints)
5. [Staff Endpoints](#staff-endpoints)
6. [SharePoint Endpoints](#sharepoint-endpoints)
7. [Example Requests](#example-requests)

---

## Authentication

Currently, the API does not require authentication. For production deployment, consider implementing:
- JWT tokens
- API keys
- OAuth 2.0

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... }  // Only for list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 404  | Not Found |
| 409  | Conflict (duplicate entry) |
| 500  | Internal Server Error |

### Common Error Responses

**Validation Error**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Full name must be between 2 and 255 characters",
      "param": "full_name",
      "location": "body"
    }
  ]
}
```

**Not Found Error**
```json
{
  "success": false,
  "message": "Sign-in not found"
}
```

---

## Sign-In Endpoints

### Create Sign-In

Creates a new visitor or contractor sign-in record.

**Endpoint:** `POST /api/sign-ins`

**Request Body:**
```json
{
  "visitor_type": "visitor",           // Required: "visitor" or "contractor"
  "full_name": "John Doe",             // Required: 2-255 characters
  "phone_number": "+1234567890",       // Required: 5-50 characters
  "email": "john@example.com",         // Optional: valid email
  "company_name": "ACME Corp",         // Optional: max 255 characters
  "purpose_of_visit": "Business meeting", // Required: min 3 characters
  "car_registration": "ABC123",        // Optional: max 50 characters
  "visiting_person": "Jane Smith",     // Required: 2-255 characters
  "photo": "data:image/png;base64,...",// Optional: base64 encoded image
  "signature": "data:image/png;base64,..." // Optional: base64 encoded signature
}
```

**Response:** `201 Created`
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
    "purpose_of_visit": "Business meeting",
    "car_registration": "ABC123",
    "visiting_person": "Jane Smith",
    "photo": "data:image/png;base64,...",
    "signature": "data:image/png;base64,...",
    "sign_in_time": "2025-01-15T10:30:00.000Z",
    "sign_out_time": null,
    "status": "signed_in",
    "sharepoint_synced": false,
    "sharepoint_sync_time": null,
    "sharepoint_sync_error": null,
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Get All Sign-Ins

Retrieves a list of sign-in records with optional filtering and pagination.

**Endpoint:** `GET /api/sign-ins`

**Query Parameters:**
- `status` (optional): Filter by status - `signed_in` or `signed_out`
- `visitor_type` (optional): Filter by type - `visitor` or `contractor`
- `limit` (optional): Number of records to return (1-100, default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Example Request:**
```
GET /api/sign-ins?status=signed_in&limit=10&offset=0
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "visitor_type": "visitor",
      "full_name": "John Doe",
      "phone_number": "+1234567890",
      "email": "john@example.com",
      "company_name": "ACME Corp",
      "purpose_of_visit": "Business meeting",
      "car_registration": "ABC123",
      "visiting_person": "Jane Smith",
      "sign_in_time": "2025-01-15T10:30:00.000Z",
      "sign_out_time": null,
      "status": "signed_in",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Get Active Visitors

Retrieves all currently signed-in visitors with time on site calculation.

**Endpoint:** `GET /api/sign-ins/status/active`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "visitor_type": "visitor",
      "full_name": "John Doe",
      "phone_number": "+1234567890",
      "email": "john@example.com",
      "company_name": "ACME Corp",
      "purpose_of_visit": "Business meeting",
      "car_registration": "ABC123",
      "visiting_person": "Jane Smith",
      "sign_in_time": "2025-01-15T10:30:00.000Z",
      "hours_on_site": 2.5
    }
  ],
  "count": 1
}
```

---

### Get Single Sign-In

Retrieves a specific sign-in record by ID.

**Endpoint:** `GET /api/sign-ins/:id`

**URL Parameters:**
- `id`: Sign-in record ID (integer)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com",
    "company_name": "ACME Corp",
    "purpose_of_visit": "Business meeting",
    "car_registration": "ABC123",
    "visiting_person": "Jane Smith",
    "photo": "data:image/png;base64,...",
    "signature": "data:image/png;base64,...",
    "sign_in_time": "2025-01-15T10:30:00.000Z",
    "sign_out_time": null,
    "status": "signed_in",
    "sharepoint_synced": false,
    "sharepoint_sync_time": null,
    "sharepoint_sync_error": null,
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "message": "Sign-in not found"
}
```

---

### Sign Out Visitor

Signs out a visitor by updating their status and recording the sign-out time.

**Endpoint:** `PUT /api/sign-ins/:id/sign-out`

**URL Parameters:**
- `id`: Sign-in record ID (integer)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Visitor signed out successfully",
  "data": {
    "id": 1,
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "status": "signed_out",
    "sign_in_time": "2025-01-15T10:30:00.000Z",
    "sign_out_time": "2025-01-15T15:45:00.000Z",
    "updated_at": "2025-01-15T15:45:00.000Z"
  }
}
```

**Error Responses:**

`404 Not Found`
```json
{
  "success": false,
  "message": "Sign-in not found"
}
```

`400 Bad Request`
```json
{
  "success": false,
  "message": "Visitor is already signed out"
}
```

---

### Delete Sign-In

Deletes a sign-in record permanently.

**Endpoint:** `DELETE /api/sign-ins/:id`

**URL Parameters:**
- `id`: Sign-in record ID (integer)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Sign-in deleted successfully",
  "data": {
    "id": 1,
    "full_name": "John Doe"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "message": "Sign-in not found"
}
```

---

## Staff Endpoints

### Get All Staff

Retrieves all staff members.

**Endpoint:** `GET /api/staff`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Jane Smith",
      "email": "jane@company.com",
      "department": "IT",
      "created_at": "2025-01-15T09:00:00.000Z",
      "updated_at": "2025-01-15T09:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Get Single Staff Member

Retrieves a specific staff member by ID.

**Endpoint:** `GET /api/staff/:id`

**URL Parameters:**
- `id`: Staff member ID (integer)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@company.com",
    "department": "IT",
    "created_at": "2025-01-15T09:00:00.000Z",
    "updated_at": "2025-01-15T09:00:00.000Z"
  }
}
```

---

### Create Staff Member

Creates a new staff member.

**Endpoint:** `POST /api/staff`

**Request Body:**
```json
{
  "name": "Jane Smith",              // Required: 2-255 characters
  "email": "jane@company.com",       // Required: valid email, must be unique
  "department": "IT"                 // Optional: max 255 characters
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@company.com",
    "department": "IT",
    "created_at": "2025-01-15T09:00:00.000Z",
    "updated_at": "2025-01-15T09:00:00.000Z"
  }
}
```

**Error Response:** `409 Conflict`
```json
{
  "success": false,
  "message": "Staff member with this email already exists"
}
```

---

### Update Staff Member

Updates an existing staff member.

**Endpoint:** `PUT /api/staff/:id`

**URL Parameters:**
- `id`: Staff member ID (integer)

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "department": "Operations"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Staff member updated successfully",
  "data": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@company.com",
    "department": "Operations",
    "created_at": "2025-01-15T09:00:00.000Z",
    "updated_at": "2025-01-15T16:00:00.000Z"
  }
}
```

---

### Delete Staff Member

Deletes a staff member.

**Endpoint:** `DELETE /api/staff/:id`

**URL Parameters:**
- `id`: Staff member ID (integer)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Staff member deleted successfully",
  "data": {
    "id": 1,
    "name": "Jane Smith"
  }
}
```

---

## SharePoint Endpoints

### Sync All Unsynced Records

Syncs all sign-in records that haven't been synced to SharePoint yet.

**Endpoint:** `POST /api/sharepoint/sync`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Synced 5 of 5 records",
  "results": {
    "total": 5,
    "synced": 5,
    "failed": 0,
    "details": [
      {
        "success": true,
        "message": "Record synced successfully",
        "recordId": 1
      }
    ]
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "SharePoint integration is disabled"
}
```

---

### Sync Specific Record

Syncs a specific sign-in record to SharePoint.

**Endpoint:** `POST /api/sharepoint/sync/:id`

**URL Parameters:**
- `id`: Sign-in record ID (integer)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Record synced successfully",
  "recordId": 1
}
```

---

### Read from SharePoint

Reads all data from the SharePoint Excel file.

**Endpoint:** `GET /api/sharepoint/read`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "visitor_type": "visitor",
      "full_name": "John Doe",
      "phone_number": "+1234567890",
      "email": "john@example.com",
      "company_name": "ACME Corp",
      "purpose_of_visit": "Business meeting",
      "car_registration": "ABC123",
      "visiting_person": "Jane Smith",
      "sign_in_time": "2025-01-15T10:30:00.000Z",
      "sign_out_time": "2025-01-15T15:45:00.000Z",
      "status": "signed_out"
    }
  ],
  "count": 1
}
```

---

### Check SharePoint Status

Checks the status and configuration of SharePoint integration.

**Endpoint:** `GET /api/sharepoint/status`

**Response:** `200 OK`
```json
{
  "success": true,
  "enabled": true,
  "initialized": true,
  "configured": true
}
```

---

## Example Requests

### Using cURL

**Create a Sign-In:**
```bash
curl -X POST http://localhost:3000/api/sign-ins \
  -H "Content-Type: application/json" \
  -d '{
    "visitor_type": "visitor",
    "full_name": "John Doe",
    "phone_number": "+1234567890",
    "email": "john@example.com",
    "company_name": "ACME Corp",
    "purpose_of_visit": "Business meeting",
    "car_registration": "ABC123",
    "visiting_person": "Jane Smith"
  }'
```

**Get Active Visitors:**
```bash
curl http://localhost:3000/api/sign-ins/status/active
```

**Sign Out a Visitor:**
```bash
curl -X PUT http://localhost:3000/api/sign-ins/1/sign-out
```

### Using JavaScript (Fetch)

```javascript
// Create a Sign-In
const createSignIn = async () => {
  const response = await fetch('http://localhost:3000/api/sign-ins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      visitor_type: 'visitor',
      full_name: 'John Doe',
      phone_number: '+1234567890',
      email: 'john@example.com',
      company_name: 'ACME Corp',
      purpose_of_visit: 'Business meeting',
      car_registration: 'ABC123',
      visiting_person: 'Jane Smith'
    })
  });

  const data = await response.json();
  console.log(data);
};

// Get Active Visitors
const getActiveVisitors = async () => {
  const response = await fetch('http://localhost:3000/api/sign-ins/status/active');
  const data = await response.json();
  console.log(data);
};

// Sign Out Visitor
const signOutVisitor = async (id) => {
  const response = await fetch(`http://localhost:3000/api/sign-ins/${id}/sign-out`, {
    method: 'PUT'
  });
  const data = await response.json();
  console.log(data);
};
```

### Using Python (Requests)

```python
import requests

# Create a Sign-In
def create_sign_in():
    url = 'http://localhost:3000/api/sign-ins'
    data = {
        'visitor_type': 'visitor',
        'full_name': 'John Doe',
        'phone_number': '+1234567890',
        'email': 'john@example.com',
        'company_name': 'ACME Corp',
        'purpose_of_visit': 'Business meeting',
        'car_registration': 'ABC123',
        'visiting_person': 'Jane Smith'
    }
    response = requests.post(url, json=data)
    print(response.json())

# Get Active Visitors
def get_active_visitors():
    url = 'http://localhost:3000/api/sign-ins/status/active'
    response = requests.get(url)
    print(response.json())

# Sign Out Visitor
def sign_out_visitor(visitor_id):
    url = f'http://localhost:3000/api/sign-ins/{visitor_id}/sign-out'
    response = requests.put(url)
    print(response.json())
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production deployment, consider:
- Implementing rate limiting per IP address
- Setting appropriate limits based on use case
- Using Redis for distributed rate limiting

---

## Versioning

Current API version: **v1.0**

Future versions will be accessible via:
```
/api/v2/sign-ins
```

---

## Support

For API-related questions:
- Review this documentation
- Check the test suite in `/backend/tests/api-test.js`
- Run the test suite to see working examples
- Refer to the main README.md for setup instructions
