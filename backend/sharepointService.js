const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const ExcelJS = require('exceljs');
require('dotv').config();

class SharePointService {
    constructor() {
        this.credential = null;
        this.client = null;
        this.initializeClient();
    }

    initializeClient() {
        try {
            // Create credential for authentication
            this.credential = new ClientSecretCredential(
                process.env.AZURE_TENANT_ID,
                process.env.AZURE_CLIENT_ID,
                process.env.AZURE_CLIENT_SECRET
            );

            // Initialize Graph client
            this.client = Client.initWithMiddleware({
                authProvider: {
                    getAccessToken: async () => {
                        const token = await this.credential.getToken(
                            'https://graph.microsoft.com/.default'
                        );
                        return token.token;
                    }
                }
            });

            console.log('✓ SharePoint service initialized');
        } catch (error) {
            console.error('✗ Failed to initialize SharePoint service:', error.message);
            console.log('SharePoint integration will be unavailable');
        }
    }

    /**
     * Sync sign-in records to SharePoint Excel file
     * @param {Array} records - Array of sign-in records
     */
    async syncToSharePoint(records) {
        if (!this.client) {
            console.log('SharePoint client not initialized. Skipping sync.');
            return { success: false, message: 'SharePoint not configured' };
        }

        try {
            const siteId = process.env.SHAREPOINT_SITE_ID;
            const driveId = process.env.SHAREPOINT_DRIVE_ID;
            const filePath = process.env.EXCEL_FILE_PATH;

            // Get the Excel file
            const file = await this.client
                .api(`/sites/${siteId}/drives/${driveId}/root:${filePath}:/content`)
                .get();

            // Load workbook
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(file);

            const worksheet = workbook.getWorksheet(1) || workbook.addWorksheet('Sign-Ins');

            // Add headers if worksheet is empty
            if (worksheet.rowCount === 0) {
                worksheet.addRow([
                    'ID',
                    'Visitor Type',
                    'Full Name',
                    'Phone',
                    'Email',
                    'Company',
                    'Purpose',
                    'Car Registration',
                    'Visiting Person',
                    'Sign In Time',
                    'Sign Out Time',
                    'Status'
                ]);
            }

            // Add records
            records.forEach(record => {
                worksheet.addRow([
                    record.id,
                    record.visitor_type,
                    record.full_name,
                    record.phone,
                    record.email || '',
                    record.company || '',
                    record.purpose || '',
                    record.car_registration || '',
                    record.visiting_person || '',
                    record.sign_in_time,
                    record.sign_out_time || '',
                    record.status
                ]);
            });

            // Save workbook
            const buffer = await workbook.xlsx.writeBuffer();

            // Upload back to SharePoint
            await this.client
                .api(`/sites/${siteId}/drives/${driveId}/root:${filePath}:/content`)
                .put(buffer);

            console.log(`✓ Synced ${records.length} records to SharePoint`);

            return {
                success: true,
                recordsSynced: records.length,
                message: 'Records synced successfully'
            };

        } catch (error) {
            console.error('Error syncing to SharePoint:', error);
            throw new Error(`SharePoint sync failed: ${error.message}`);
        }
    }

    /**
     * Read data from SharePoint Excel file
     */
    async readFromSharePoint() {
        if (!this.client) {
            console.log('SharePoint client not initialized. Cannot read.');
            return { success: false, message: 'SharePoint not configured', data: [] };
        }

        try {
            const siteId = process.env.SHAREPOINT_SITE_ID;
            const driveId = process.env.SHAREPOINT_DRIVE_ID;
            const filePath = process.env.EXCEL_FILE_PATH;

            // Get the Excel file
            const file = await this.client
                .api(`/sites/${siteId}/drives/${driveId}/root:${filePath}:/content`)
                .get();

            // Load workbook
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(file);

            const worksheet = workbook.getWorksheet(1);
            
            if (!worksheet) {
                return { success: true, data: [], message: 'No data found' };
            }

            const data = [];
            const headers = [];

            // Get headers from first row
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value;
            });

            // Get data rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header row
                
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value;
                });
                data.push(rowData);
            });

            console.log(`✓ Read ${data.length} records from SharePoint`);

            return {
                success: true,
                data: data,
                message: 'Data read successfully'
            };

        } catch (error) {
            console.error('Error reading from SharePoint:', error);
            throw new Error(`SharePoint read failed: ${error.message}`);
        }
    }

    /**
     * Create Excel file in SharePoint if it doesn't exist
     */
    async createExcelFile() {
        if (!this.client) {
            throw new Error('SharePoint client not initialized');
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sign-Ins');

            // Add headers
            worksheet.addRow([
                'ID',
                'Visitor Type',
                'Full Name',
                'Phone',
                'Email',
                'Company',
                'Purpose',
                'Car Registration',
                'Visiting Person',
                'Sign In Time',
                'Sign Out Time',
                'Status'
            ]);

            // Style headers
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };

            const buffer = await workbook.xlsx.writeBuffer();

            const siteId = process.env.SHAREPOINT_SITE_ID;
            const driveId = process.env.SHAREPOINT_DRIVE_ID;
            const filePath = process.env.EXCEL_FILE_PATH;

            // Upload to SharePoint
            await this.client
                .api(`/sites/${siteId}/drives/${driveId}/root:${filePath}:/content`)
                .put(buffer);

            console.log('✓ Excel file created in SharePoint');

            return { success: true, message: 'Excel file created successfully' };

        } catch (error) {
            console.error('Error creating Excel file:', error);
            throw new Error(`Failed to create Excel file: ${error.message}`);
        }
    }
}

module.exports = new SharePointService();