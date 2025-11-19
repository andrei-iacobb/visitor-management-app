# SharePoint Integration Plan - Two-Way Sync with Upsert Strategy

## Overview
Implement bidirectional synchronization between SharePoint Excel files and PostgreSQL database for:
- **Allowed Contractors** (company whitelist)
- **Vehicle Registry** (fleet management)

**Sync Strategy**: Option 2 - Two-way sync (Excel ↔ Database)
**Data Strategy**: Approach 2 - Upsert (INSERT if new, UPDATE if exists)

---

## Prerequisites

### 1. Azure AD App Registration
Create an app registration in Azure Portal to access Microsoft Graph API.

**Steps**:
1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Name: `Visitor-Management-SharePoint-Sync`
4. Supported account types: **Single tenant**
5. Click **Register**

**API Permissions Required**:
- `Sites.ReadWrite.All` - Read and write SharePoint site content
- `Files.ReadWrite.All` - Read and write Excel files

**Grant Admin Consent**: Required (need tenant admin rights)

**Credentials to Obtain**:
```env
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your_client_secret_here  # Generate under "Certificates & secrets"
```

---

### 2. SharePoint Site & File Setup

**Required Information**:
- SharePoint site URL (e.g., `https://contoso.sharepoint.com/sites/VisitorManagement`)
- Excel file paths for:
  - `/Shared Documents/AllowedContractors.xlsx`
  - `/Shared Documents/VehicleRegistry.xlsx`

**Get SharePoint Site ID**:
```bash
# Use Microsoft Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer
GET https://graph.microsoft.com/v1.0/sites/{hostname}:/sites/{site-name}
```

Example:
```bash
GET https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/VisitorManagement
```

Response:
```json
{
  "id": "contoso.sharepoint.com,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

**Get Drive ID**:
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

---

### 3. Excel File Structure

Excel files must have **consistent column headers** with data starting from row 2.

**AllowedContractors.xlsx**:
| Company Name | Contractor Name | Email | Phone Number | Status | Notes |
|--------------|----------------|-------|--------------|--------|-------|
| ABC Electric | John Doe | john@abc.com | 555-0101 | approved | ... |
| BuildRight Construction | Mike Johnson | mike@buildright.com | 555-0102 | approved | ... |

**Columns**:
- **Company Name** (required) - Maps to `company_name`
- **Contractor Name** (optional) - Maps to `contractor_name`
- **Email** (optional) - Maps to `email`
- **Phone Number** (optional) - Maps to `phone_number`
- **Status** (required) - Must be: `approved`, `pending`, or `denied`
- **Notes** (optional) - Maps to `notes`

---

**VehicleRegistry.xlsx**:
| Registration | Status | Current Mileage | Notes |
|--------------|--------|-----------------|-------|
| ABC123 | available | 50000 | Fleet vehicle |
| XYZ789 | in_use | 32000 | Delivery van |

**Columns**:
- **Registration** (required) - Maps to `registration` (unique key)
- **Status** (required) - Must be: `available`, `in_use`, or `maintenance`
- **Current Mileage** (optional) - Maps to `current_mileage` (integer)
- **Notes** (optional) - Not in current DB schema (would need to add column)

---

## Environment Configuration

Add to `.env`:
```env
# SharePoint Integration
ENABLE_SHAREPOINT=true
AZURE_TENANT_ID=your_tenant_id_here
AZURE_CLIENT_ID=your_client_id_here
AZURE_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_SITE_ID=your_site_id_here
SHAREPOINT_DRIVE_ID=your_drive_id_here

# Excel file paths (relative to drive root)
CONTRACTORS_EXCEL_PATH=/Shared Documents/AllowedContractors.xlsx
VEHICLES_EXCEL_PATH=/Shared Documents/VehicleRegistry.xlsx

# Sync settings
SHAREPOINT_SYNC_INTERVAL=*/15 * * * *  # Every 15 minutes (cron format)
SHAREPOINT_SYNC_DIRECTION=bidirectional  # Options: bidirectional, excel_to_db, db_to_excel
SHAREPOINT_AUTO_SYNC_ENABLED=true       # Enable automatic scheduled sync
```

---

## Column Mapping Configuration

**Contractors Mapping**:
```javascript
const contractorMapping = {
  'Company Name': 'company_name',       // Required
  'Contractor Name': 'contractor_name', // Optional
  'Email': 'email',                     // Optional
  'Phone Number': 'phone_number',       // Optional
  'Status': 'status',                   // Required: 'approved', 'pending', 'denied'
  'Notes': 'notes'                      // Optional
};
```

**Vehicles Mapping**:
```javascript
const vehicleMapping = {
  'Registration': 'registration',       // Required (unique key)
  'Status': 'status',                   // Required: 'available', 'in_use', 'maintenance'
  'Current Mileage': 'current_mileage', // Optional (integer)
  'Notes': 'notes'                      // Optional (NOT in current schema - would need ALTER TABLE)
};
```

---

## Implementation Plan

### Phase 1: Excel → Database Sync (Pull from SharePoint)

**File**: `/backend/services/sharepointService.js` (already exists - 288 lines)

**Functions to Implement**:

1. **`downloadExcelFile(filePath)`**
   - Downloads Excel file from SharePoint using Microsoft Graph API
   - Returns file buffer

2. **`parseExcelToJSON(buffer, sheetName, mapping)`**
   - Uses `exceljs` library (already installed)
   - Parses Excel rows to JSON using column mapping
   - Validates data types (e.g., status must be valid ENUM)
   - Returns array of objects

3. **`syncContractorsFromExcel()`**
   - Downloads AllowedContractors.xlsx
   - Parses to JSON
   - For each row:
     ```sql
     INSERT INTO allowed_contractors (company_name, contractor_name, email, phone_number, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (company_name, contractor_name)
     DO UPDATE SET
       email = EXCLUDED.email,
       phone_number = EXCLUDED.phone_number,
       status = EXCLUDED.status,
       notes = EXCLUDED.notes,
       updated_at = CURRENT_TIMESTAMP
     ```
   - Logs: rows inserted, updated, errors
   - Returns sync summary

4. **`syncVehiclesFromExcel()`**
   - Downloads VehicleRegistry.xlsx
   - Parses to JSON
   - For each row:
     ```sql
     INSERT INTO vehicles (registration, status, current_mileage)
     VALUES ($1, $2, $3)
     ON CONFLICT (registration)
     DO UPDATE SET
       status = EXCLUDED.status,
       current_mileage = EXCLUDED.current_mileage,
       updated_at = CURRENT_TIMESTAMP
     ```
   - Logs: rows inserted, updated, errors
   - Returns sync summary

---

### Phase 2: Database → Excel Sync (Push to SharePoint)

**Functions to Implement**:

1. **`convertJSONToExcel(data, mapping, sheetName)`**
   - Takes array of DB records
   - Maps database column names to Excel headers
   - Creates Excel workbook using `exceljs`
   - Returns buffer

2. **`uploadExcelFile(buffer, filePath)`**
   - Uploads Excel file to SharePoint
   - Overwrites existing file
   - Uses Microsoft Graph API: `PUT /drives/{drive-id}/root:/{file-path}:/content`

3. **`syncContractorsToExcel()`**
   - Queries all contractors from DB
   - Converts to Excel format
   - Uploads to SharePoint
   - Returns upload status

4. **`syncVehiclesToExcel()`**
   - Queries all vehicles from DB
   - Converts to Excel format
   - Uploads to SharePoint
   - Returns upload status

---

### Phase 3: Bidirectional Sync (Two-Way)

**Function**: `syncBidirectional()`

**Logic**:
1. **Pull Phase** (Excel → DB):
   - Download Excel files
   - Upsert into database
   - Track changes: `{ inserted: 5, updated: 3, errors: 0 }`

2. **Push Phase** (DB → Excel):
   - Query database for all records
   - Generate Excel files
   - Upload to SharePoint
   - Track changes: `{ uploaded: true, timestamp: '...' }`

**Conflict Resolution**:
- **Strategy**: Last-write-wins (timestamp-based)
- Excel always overwrites DB on pull
- DB always overwrites Excel on push
- Alternative: Add `last_modified` column to both Excel and DB, only sync if Excel is newer

---

### Phase 4: Scheduled Sync (Node-Cron)

**File**: `/backend/server.js`

**Implementation**:
```javascript
const cron = require('node-cron');
const { syncBidirectional } = require('./services/sharepointService');

if (process.env.SHAREPOINT_AUTO_SYNC_ENABLED === 'true') {
  // Schedule sync job
  cron.schedule(process.env.SHAREPOINT_SYNC_INTERVAL || '*/15 * * * *', async () => {
    logger.info('Starting scheduled SharePoint bidirectional sync...');

    try {
      const result = await syncBidirectional();

      logger.info('SharePoint sync completed successfully', {
        contractors: result.contractors,
        vehicles: result.vehicles,
        duration: result.duration
      });
    } catch (error) {
      logger.error('SharePoint sync failed', {
        error: error.message,
        stack: error.stack
      });
    }
  });

  logger.info(`SharePoint auto-sync enabled - running every ${process.env.SHAREPOINT_SYNC_INTERVAL}`);
}
```

---

### Phase 5: Manual Sync API Endpoints

**File**: `/backend/routes/sharepointRoutes.js` (already exists - 103 lines)

**Endpoints to Implement**:

```javascript
// Manual sync triggers
POST /api/v1/sharepoint/sync/contractors/pull  # Excel → DB (contractors only)
POST /api/v1/sharepoint/sync/contractors/push  # DB → Excel (contractors only)
POST /api/v1/sharepoint/sync/vehicles/pull     # Excel → DB (vehicles only)
POST /api/v1/sharepoint/sync/vehicles/push     # DB → Excel (vehicles only)
POST /api/v1/sharepoint/sync/full              # Bidirectional sync (all)

// Status and monitoring
GET  /api/v1/sharepoint/status                 # Last sync time, status, errors
GET  /api/v1/sharepoint/logs?limit=50          # Sync history
```

**Example Response** (`POST /api/v1/sharepoint/sync/full`):
```json
{
  "success": true,
  "message": "Bidirectional sync completed successfully",
  "data": {
    "contractors": {
      "pull": { "inserted": 5, "updated": 3, "errors": 0 },
      "push": { "uploaded": true, "records": 8 }
    },
    "vehicles": {
      "pull": { "inserted": 2, "updated": 1, "errors": 0 },
      "push": { "uploaded": true, "records": 3 }
    },
    "duration": "2.3s",
    "timestamp": "2025-01-17T10:30:00Z"
  }
}
```

---

## Error Handling

**Scenarios to Handle**:

1. **Excel File Not Found**
   - Log error, skip sync, retry next interval
   - Alert admin via logger.error()

2. **Invalid Data in Excel**
   - Row validation: skip invalid rows, log details
   - Continue processing valid rows

3. **Database Errors**
   - Constraint violations (unique, foreign key)
   - Log error with row details, continue

4. **SharePoint API Errors**
   - 401 Unauthorized: Token expired → refresh token
   - 429 Rate Limit: Exponential backoff
   - 500 Server Error: Retry 3 times

5. **Network Failures**
   - Retry with exponential backoff (2s, 4s, 8s)
   - Max 5 retries

**Error Logging**:
```javascript
logger.error('SharePoint sync failed for contractors', {
  error: error.message,
  stack: error.stack,
  phase: 'pull',  // 'pull' or 'push'
  entity: 'contractors',
  rowsProcessed: 15,
  rowsFailed: 2,
  failedRows: [
    { row: 3, reason: 'Invalid status value: "aproved"' },
    { row: 7, reason: 'Missing required field: company_name' }
  ]
});
```

---

## Database Schema Considerations

### Current Schema Limitations

**`allowed_contractors` table**:
- ✅ Has `company_name`, `contractor_name`, `email`, `phone_number`, `status`, `notes`
- ⚠️ Unique constraint on `(company_name, contractor_name)` WHERE `status='approved'`
- **Issue**: Upsert needs unique key - use composite key `(company_name, contractor_name)`

**`vehicles` table**:
- ✅ Has `registration` (unique), `status`, `current_mileage`
- ❌ No `notes` column (Excel has this)

**Recommended Schema Change**:
```sql
-- Add notes column to vehicles table (optional)
ALTER TABLE vehicles ADD COLUMN notes TEXT;
```

---

### Upsert SQL Templates

**Contractors**:
```sql
INSERT INTO allowed_contractors (
  company_name, contractor_name, email, phone_number, status, notes
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (company_name, contractor_name)
DO UPDATE SET
  email = EXCLUDED.email,
  phone_number = EXCLUDED.phone_number,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
```

**Vehicles**:
```sql
INSERT INTO vehicles (registration, status, current_mileage, notes)
VALUES ($1, $2, $3, $4)
ON CONFLICT (registration)
DO UPDATE SET
  status = EXCLUDED.status,
  current_mileage = EXCLUDED.current_mileage,
  notes = EXCLUDED.notes,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
```

---

## Testing Plan

### Unit Tests
1. **Excel Parsing**:
   - Valid Excel file → JSON
   - Missing columns → error
   - Invalid data types → skip row

2. **Upsert Logic**:
   - New record → INSERT
   - Existing record → UPDATE
   - Unique constraint violation → handle gracefully

### Integration Tests
1. **SharePoint API**:
   - Download file
   - Upload file
   - Token refresh
   - Error handling (404, 401, 429, 500)

2. **End-to-End Sync**:
   - Create Excel file with test data
   - Upload to SharePoint
   - Trigger sync
   - Verify database records
   - Modify database
   - Trigger reverse sync
   - Verify Excel file updated

### Manual Testing Checklist
- [ ] Azure AD app registration created
- [ ] API permissions granted (admin consent)
- [ ] SharePoint site ID obtained
- [ ] Drive ID obtained
- [ ] Excel files created with correct headers
- [ ] Environment variables configured
- [ ] Manual sync: Excel → DB (contractors)
- [ ] Manual sync: Excel → DB (vehicles)
- [ ] Manual sync: DB → Excel (contractors)
- [ ] Manual sync: DB → Excel (vehicles)
- [ ] Bidirectional sync works
- [ ] Scheduled sync runs every 15 minutes
- [ ] Error handling works (invalid data, network failure)
- [ ] Logs captured in Winston

---

## Monitoring & Observability

**Metrics to Track**:
- Sync duration (ms)
- Records inserted/updated/failed
- API call latency
- Error rate
- Last successful sync timestamp

**Dashboard in Admin Panel**:
```
╔═══════════════════════════════════════════════╗
║       SharePoint Sync Status                  ║
╠═══════════════════════════════════════════════╣
║ Last Sync: 2025-01-17 10:30:00 (5 min ago)   ║
║ Status: ✅ Success                            ║
║ Duration: 2.3s                                ║
║                                               ║
║ Contractors:                                  ║
║   Pull: 5 inserted, 3 updated, 0 errors      ║
║   Push: 8 records uploaded                    ║
║                                               ║
║ Vehicles:                                     ║
║   Pull: 2 inserted, 1 updated, 0 errors      ║
║   Push: 3 records uploaded                    ║
║                                               ║
║ [Manual Sync] [View Logs] [Settings]         ║
╚═══════════════════════════════════════════════╝
```

---

## Security Considerations

1. **Client Secret Storage**:
   - ❌ Never commit to Git
   - ✅ Use environment variables
   - ✅ Rotate secrets quarterly

2. **API Permissions**:
   - ✅ Use minimum required permissions (Sites.ReadWrite.All, Files.ReadWrite.All)
   - ❌ Avoid `*.All` permissions if possible

3. **Data Validation**:
   - ✅ Validate all Excel data before database insertion
   - ✅ Sanitize user input to prevent SQL injection (use parameterized queries)

4. **Audit Logging**:
   - ✅ Log all sync operations
   - ✅ Log who triggered manual syncs
   - ✅ Retain logs for compliance

---

## Next Steps

1. **Azure Setup** (1-2 hours):
   - Create App Registration
   - Grant API permissions
   - Generate client secret
   - Test with Graph Explorer

2. **SharePoint File Setup** (30 mins):
   - Create Excel files with headers
   - Upload to SharePoint
   - Get Site ID and Drive ID

3. **Code Implementation** (8-12 hours):
   - Implement Excel download/upload functions
   - Implement upsert logic
   - Add scheduled cron job
   - Create API endpoints
   - Error handling + logging

4. **Testing** (4-6 hours):
   - Manual sync tests
   - Edge case handling
   - Stress testing (large files)
   - Validate bidirectional sync

5. **Documentation** (2 hours):
   - Admin guide for setting up SharePoint
   - Troubleshooting guide
   - API documentation

**Estimated Total Effort**: 15-22 hours

---

## Dependencies Already Installed

✅ `@microsoft/microsoft-graph-client` - Graph API client
✅ `@azure/identity` - Azure authentication
✅ `exceljs` - Excel parsing/generation
✅ `node-cron` - Job scheduling
✅ `winston` - Logging

No additional dependencies needed!

---

## Contact & Support

For questions or issues during implementation:
- Microsoft Graph API Docs: https://learn.microsoft.com/en-us/graph/
- ExcelJS Documentation: https://github.com/exceljs/exceljs
- Azure AD App Registration Guide: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
