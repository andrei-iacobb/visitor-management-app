# SharePoint Integration Setup Guide

This guide walks you through setting up SharePoint integration for the Visitor Management System.

## Overview

The system uses Microsoft Graph API to read from and write to Excel files stored in SharePoint. This allows you to:
- Sync visitor sign-in records to a SharePoint Excel file
- Read existing data from SharePoint
- Maintain a centralized record accessible through Office 365

## Prerequisites

- Microsoft 365 subscription with SharePoint access
- Azure AD administrator access (to create app registration)
- SharePoint site with document library

## Step 1: Create Azure AD App Registration

1. **Go to Azure Portal**
   - Navigate to [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Microsoft 365 admin account

2. **Navigate to Azure Active Directory**
   - Click on "Azure Active Directory" in the left sidebar
   - Select "App registrations" from the menu

3. **Create New Registration**
   - Click "+ New registration"
   - Fill in the details:
     - **Name**: `Visitor Management System`
     - **Supported account types**: Select "Accounts in this organizational directory only"
     - **Redirect URI**: Leave blank (not needed for service principal)
   - Click "Register"

4. **Note Your Application (Client) ID**
   - On the Overview page, copy the "Application (client) ID"
   - This is your `AZURE_CLIENT_ID`

5. **Note Your Directory (Tenant) ID**
   - On the same Overview page, copy the "Directory (tenant) ID"
   - This is your `AZURE_TENANT_ID`

## Step 2: Create Client Secret

1. **Generate Client Secret**
   - In your app registration, click "Certificates & secrets" in the left menu
   - Click "+ New client secret"
   - Add a description: `Visitor Management API`
   - Choose an expiration period (recommended: 24 months)
   - Click "Add"

2. **Copy the Secret Value**
   - **IMPORTANT**: Copy the secret value immediately - it won't be shown again!
   - This is your `AZURE_CLIENT_SECRET`
   - Store it securely

## Step 3: Configure API Permissions

1. **Add Graph API Permissions**
   - Click "API permissions" in the left menu
   - Click "+ Add a permission"
   - Select "Microsoft Graph"
   - Choose "Application permissions" (not Delegated)

2. **Add Required Permissions**
   Add the following permissions:
   - `Sites.ReadWrite.All` - Read and write items in all site collections
   - `Files.ReadWrite.All` - Read and write files in all site collections

3. **Grant Admin Consent**
   - Click "Grant admin consent for [Your Organization]"
   - Click "Yes" to confirm
   - Verify all permissions show "Granted" status

## Step 4: Get SharePoint Site ID

### Method 1: Using Microsoft Graph Explorer (Recommended)

1. **Open Graph Explorer**
   - Go to [https://developer.microsoft.com/graph/graph-explorer](https://developer.microsoft.com/graph/graph-explorer)
   - Sign in with your admin account

2. **Get Site ID**
   - Run this query:
     ```
     GET https://graph.microsoft.com/v1.0/sites/{your-tenant}.sharepoint.com:/sites/{your-site-name}
     ```
   - Replace `{your-tenant}` with your tenant name (e.g., contoso)
   - Replace `{your-site-name}` with your SharePoint site name
   - Copy the `id` value from the response
   - This is your `SHAREPOINT_SITE_ID`

### Method 2: Using PowerShell

```powershell
# Connect to SharePoint
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/yoursite" -Interactive

# Get Site ID
$site = Get-PnPSite -Includes Id
$site.Id
```

## Step 5: Get SharePoint Drive ID

### Using Graph Explorer

1. **Get All Drives**
   - Run this query:
     ```
     GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
     ```
   - Replace `{site-id}` with your SharePoint Site ID

2. **Find Your Document Library**
   - Look for the drive with the name of your document library (usually "Documents")
   - Copy the `id` value
   - This is your `SHAREPOINT_DRIVE_ID`

## Step 6: Configure Excel File Path

1. **Decide File Location**
   - Choose where to store the Excel file in your SharePoint document library
   - Example: `/VisitorManagement/SignIns.xlsx`

2. **File Path Format**
   - Path should be relative to the document library root
   - Start with `/`
   - Include folder path and filename
   - This is your `EXCEL_FILE_PATH`

## Step 7: Configure Environment Variables

Update your `.env` file with all the collected values:

```env
# Enable SharePoint Integration
ENABLE_SHAREPOINT=true

# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here

# SharePoint Configuration
SHAREPOINT_SITE_ID=your-site-id-here
SHAREPOINT_DRIVE_ID=your-drive-id-here
EXCEL_FILE_PATH=/VisitorManagement/SignIns.xlsx
```

## Step 8: Test the Integration

1. **Start Your Server**
   ```bash
   npm start
   ```

2. **Check SharePoint Status**
   ```bash
   curl http://localhost:3000/api/sharepoint/status
   ```

   Expected response:
   ```json
   {
     "success": true,
     "enabled": true,
     "initialized": true,
     "configured": true
   }
   ```

3. **Create a Test Sign-In**
   ```bash
   curl -X POST http://localhost:3000/api/sign-ins \
     -H "Content-Type: application/json" \
     -d '{
       "visitor_type": "visitor",
       "full_name": "Test User",
       "phone_number": "1234567890",
       "purpose_of_visit": "Testing",
       "visiting_person": "Admin"
     }'
   ```

4. **Sync to SharePoint**
   ```bash
   curl -X POST http://localhost:3000/api/sharepoint/sync
   ```

5. **Verify in SharePoint**
   - Navigate to your SharePoint site
   - Go to the document library
   - Check if the Excel file was created
   - Open the file and verify the data

## Troubleshooting

### Error: "Insufficient privileges to complete the operation"
- Ensure you granted admin consent for the API permissions
- Verify the app has `Sites.ReadWrite.All` and `Files.ReadWrite.All` permissions
- Wait a few minutes after granting consent for changes to propagate

### Error: "The resource could not be found"
- Double-check your `SHAREPOINT_SITE_ID` and `SHAREPOINT_DRIVE_ID`
- Ensure the site and drive exist
- Verify the IDs are correctly copied (no extra spaces)

### Error: "Invalid client secret"
- Verify you copied the client secret value (not the secret ID)
- Check if the secret has expired
- Create a new client secret if needed

### Error: "File not found"
- The system will automatically create the Excel file on first sync
- Ensure the `EXCEL_FILE_PATH` is valid
- Check that any parent folders exist in SharePoint

### Connection Timeout
- Check your network connection
- Verify Azure AD endpoints are accessible
- Ensure firewall allows outbound HTTPS connections

## Security Best Practices

1. **Protect Your Client Secret**
   - Never commit `.env` files to version control
   - Store secrets in secure key management systems in production
   - Rotate secrets regularly

2. **Least Privilege Principle**
   - Only grant necessary permissions
   - Consider using more restrictive permissions if possible
   - Review app permissions regularly

3. **Monitor Access**
   - Enable audit logging in Azure AD
   - Review sign-in logs periodically
   - Set up alerts for suspicious activity

4. **Secret Rotation**
   - Set reminders for secret expiration
   - Plan secret rotation before expiration
   - Keep backup secrets during rotation

## Alternative: Using Managed Identity (Azure)

If hosting on Azure, consider using Managed Identity instead of client secrets:

1. Enable Managed Identity on your Azure App Service
2. Grant the Managed Identity appropriate permissions in Azure AD
3. Update code to use `ManagedIdentityCredential` instead of `ClientSecretCredential`
4. No need to manage client secrets

## Getting Help

### Useful Resources
- [Microsoft Graph API Documentation](https://docs.microsoft.com/graph/)
- [SharePoint REST API](https://docs.microsoft.com/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- [Azure AD App Registration Guide](https://docs.microsoft.com/azure/active-directory/develop/quickstart-register-app)

### Support Channels
- Check application logs for detailed error messages
- Review the `sharepoint_sync_error` field in the database for sync failures
- Consult Microsoft Graph API documentation for specific error codes

## Next Steps

Once SharePoint integration is working:
1. Set up automated sync schedules
2. Configure error notifications
3. Monitor sync status regularly
4. Train staff on accessing SharePoint reports
5. Set up backup procedures for Excel data

## Appendix: Common SharePoint URLs

### Graph API Endpoints
- Get Sites: `GET https://graph.microsoft.com/v1.0/sites`
- Get Drives: `GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives`
- Get Drive Items: `GET https://graph.microsoft.com/v1.0/drives/{drive-id}/root/children`

### Testing Tools
- [Microsoft Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
- [Graph API Sandbox](https://developer.microsoft.com/graph/quick-start)
- Postman collection for Graph API

## Version History

- **v1.0** - Initial SharePoint integration with Excel sync
- Future: Planned support for SharePoint Lists
