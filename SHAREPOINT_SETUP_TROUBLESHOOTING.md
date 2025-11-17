# SharePoint Setup Troubleshooting Guide

## Issue: Empty Drive ID Response

If you get `"value": []` when querying for drives, follow these steps:

### Step 1: Use Root Site (Recommended)

Instead of creating a custom site, use your tenant's root site:

```bash
# 1. Get root site ID
GET https://graph.microsoft.com/v1.0/sites/root

# Response:
{
  "id": "yourtenant.sharepoint.com,abc-123...,def-456..."
}

# 2. Get drives from root site
GET https://graph.microsoft.com/v1.0/sites/root/drives

# Response:
{
  "value": [
    {
      "id": "b!abc123def456...",
      "name": "Documents",
      "driveType": "documentLibrary"
    }
  ]
}
```

Copy the `id` from the Documents drive → this is your `SHAREPOINT_DRIVE_ID`.

### Step 2: Create Folder in Root Documents

1. Go to: `https://[yourtenant].sharepoint.com`
2. Click **Documents**
3. Create folder: **VisitorManagement**
4. Upload your Excel files here

### Step 3: Update .env Configuration

```bash
# Use root site
SHAREPOINT_SITE_ID=yourtenant.sharepoint.com,abc-123...,def-456...
SHAREPOINT_DRIVE_ID=b!abc123def456...

# Update file paths to use root/VisitorManagement folder
CONTRACTORS_EXCEL_PATH=/VisitorManagement/AllowedContractors.xlsx
VEHICLES_EXCEL_PATH=/VisitorManagement/VehicleRegistry.xlsx
```

---

## Alternative: Query Drives with Different Endpoints

### Method 1: List All Sites
```bash
GET https://graph.microsoft.com/v1.0/sites?search=*
```

This shows all sites in your tenant. Find your site and copy its ID.

### Method 2: Get Drive by Name
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists
```

This shows all lists (including document libraries) in the site.

### Method 3: Direct Drive Access
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drive
```

This gets the default drive for the site.

---

## Common Issues

### 1. Permissions Not Granted
**Symptom**: 403 Forbidden or empty results
**Solution**:
- In Graph Explorer, click "Modify permissions"
- Consent to: `Sites.ReadWrite.All`, `Files.ReadWrite.All`
- Retry the query

### 2. Site Doesn't Have Document Library
**Symptom**: Empty `value` array
**Solution**:
- Go to SharePoint site in browser
- Create a Document library: Site contents → New → Document library
- Wait 5-10 minutes for propagation
- Retry Graph API query

### 3. Wrong Site ID Format
**Symptom**: 400 Bad Request or 404 Not Found
**Solution**:
- Site ID format: `hostname,guid1,guid2`
- Example: `contoso.sharepoint.com,abc-123,def-456`
- Don't use just the site URL

### 4. Need Admin Consent
**Symptom**: "Admin approval required"
**Solution**:
- Go to Azure Portal → App Registration → API permissions
- Click "Grant admin consent for [Organization]"
- Wait a few minutes, then retry

---

## Testing Your Configuration

Once you have the Site ID and Drive ID, test access:

```bash
# Test 1: Get site info
GET https://graph.microsoft.com/v1.0/sites/{SITE_ID}

# Test 2: Get drive info
GET https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}

# Test 3: List files in VisitorManagement folder
GET https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}/root:/VisitorManagement:/children

# Test 4: Access specific Excel file
GET https://graph.microsoft.com/v1.0/drives/{DRIVE_ID}/root:/VisitorManagement/AllowedContractors.xlsx
```

If all tests work, your configuration is correct!

---

## Quick Reference: Graph Explorer Queries

### Scenario A: Using Root Site (Simplest)
```bash
1. GET /sites/root
   → Copy site ID

2. GET /sites/root/drives
   → Copy Documents drive ID

3. Upload files to: SharePoint Home → Documents → VisitorManagement/
```

### Scenario B: Using Custom Site
```bash
1. GET /sites/{tenant}.sharepoint.com:/sites/YourSiteName
   → Copy site ID

2. GET /sites/{site-id}/drives
   → Copy drive ID

3. Upload files to: Custom Site → Documents → VisitorManagement/
```

### Scenario C: Search for Site
```bash
1. GET /sites?search=Visitor
   → Find your site in results

2. GET /sites/{site-id}/drive
   → Get default drive ID

3. Upload files to site's document library
```

---

## File Path Examples

Depending on where you uploaded files, use these paths:

### Root Site Documents
```bash
CONTRACTORS_EXCEL_PATH=/VisitorManagement/AllowedContractors.xlsx
VEHICLES_EXCEL_PATH=/VisitorManagement/VehicleRegistry.xlsx
```

### Custom Site Documents
```bash
CONTRACTORS_EXCEL_PATH=/VisitorManagement/AllowedContractors.xlsx
VEHICLES_EXCEL_PATH=/VisitorManagement/VehicleRegistry.xlsx
```

### Shared Documents Library
```bash
CONTRACTORS_EXCEL_PATH=/Shared Documents/VisitorManagement/AllowedContractors.xlsx
VEHICLES_EXCEL_PATH=/Shared Documents/VisitorManagement/VehicleRegistry.xlsx
```

**Note**: Path is always relative to the drive root, starting with `/`.

---

## Need More Help?

If you're still stuck:

1. **Check Azure Portal**: Verify app permissions are granted
2. **Check SharePoint Site**: Confirm document library exists
3. **Check Graph Explorer**: Try the queries listed above
4. **Check Server Logs**: Look for detailed error messages when sync runs

The most common solution is to use the **root site** with the default **Documents** library.
