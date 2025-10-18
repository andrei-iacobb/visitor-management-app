const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
require('dotenv').config();

class SharePointService {
  constructor() {
    this.enabled = process.env.ENABLE_SHAREPOINT === 'true';
    this.tenantId = process.env.AZURE_TENANT_ID;
    this.clientId = process.env.AZURE_CLIENT_ID;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET;
    this.siteId = process.env.SHAREPOINT_SITE_ID;
    this.driveId = process.env.SHAREPOINT_DRIVE_ID;
    this.excelFilePath = process.env.EXCEL_FILE_PATH;
    this.client = null;
  }

  // Initialize Graph API client
  async initialize() {
    if (!this.enabled) {
      console.log('⚠️  SharePoint integration is disabled');
      return false;
    }

    if (!this.tenantId || !this.clientId || !this.clientSecret) {
      console.error('❌ SharePoint credentials not configured');
      return false;
    }

    try {
      const credential = new ClientSecretCredential(
        this.tenantId,
        this.clientId,
        this.clientSecret
      );

      this.client = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await credential.getToken('https://graph.microsoft.com/.default');
            return token.token;
          }
        }
      });

      console.log('✅ SharePoint client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize SharePoint client:', error.message);
      return false;
    }
  }

  // Check if Excel file exists, create if not
  async ensureExcelFileExists() {
    if (!this.client) {
      throw new Error('SharePoint client not initialized');
    }

    try {
      // Try to get the file
      await this.client
        .api(`/sites/${this.siteId}/drives/${this.driveId}/root:${this.excelFilePath}`)
        .get();

      console.log('✅ Excel file exists');
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log('📝 Creating new Excel file...');
        return await this.createExcelFile();
      }
      throw error;
    }
  }

  // Create a new Excel file with proper headers
  async createExcelFile() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sign-Ins');

    // Define headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Visitor Type', key: 'visitor_type', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 25 },
      { header: 'Phone Number', key: 'phone_number', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Company Name', key: 'company_name', width: 25 },
      { header: 'Purpose of Visit', key: 'purpose_of_visit', width: 30 },
      { header: 'Car Registration', key: 'car_registration', width: 15 },
      { header: 'Visiting Person', key: 'visiting_person', width: 25 },
      { header: 'Sign-In Time', key: 'sign_in_time', width: 20 },
      { header: 'Sign-Out Time', key: 'sign_out_time', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload to SharePoint
    const fileName = this.excelFilePath.split('/').pop();
    const folderPath = this.excelFilePath.substring(0, this.excelFilePath.lastIndexOf('/'));

    await this.client
      .api(`/sites/${this.siteId}/drives/${this.driveId}/root:${folderPath}/${fileName}:/content`)
      .putStream(buffer);

    console.log('✅ Excel file created successfully');
    return true;
  }

  // Sync a single sign-in record to SharePoint
  async syncRecord(recordId) {
    if (!this.enabled) {
      return { success: false, message: 'SharePoint integration is disabled' };
    }

    try {
      await this.initialize();
      await this.ensureExcelFileExists();

      // Get the record from database
      const query = 'SELECT * FROM sign_ins WHERE id = $1';
      const result = await pool.query(query, [recordId]);

      if (result.rows.length === 0) {
        return { success: false, message: 'Record not found' };
      }

      const record = result.rows[0];

      // Get the Excel file
      const fileResponse = await this.client
        .api(`/sites/${this.siteId}/drives/${this.driveId}/root:${this.excelFilePath}:/content`)
        .get();

      // Load workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileResponse);
      const worksheet = workbook.getWorksheet('Sign-Ins');

      // Add the record
      worksheet.addRow({
        id: record.id,
        visitor_type: record.visitor_type,
        full_name: record.full_name,
        phone_number: record.phone_number,
        email: record.email,
        company_name: record.company_name,
        purpose_of_visit: record.purpose_of_visit,
        car_registration: record.car_registration,
        visiting_person: record.visiting_person,
        sign_in_time: record.sign_in_time,
        sign_out_time: record.sign_out_time,
        status: record.status
      });

      // Write back to SharePoint
      const buffer = await workbook.xlsx.writeBuffer();
      await this.client
        .api(`/sites/${this.siteId}/drives/${this.driveId}/root:${this.excelFilePath}:/content`)
        .put(buffer);

      // Update sync status in database
      const updateQuery = `
        UPDATE sign_ins
        SET sharepoint_synced = true, sharepoint_sync_time = CURRENT_TIMESTAMP, sharepoint_sync_error = NULL
        WHERE id = $1
      `;
      await pool.query(updateQuery, [recordId]);

      return { success: true, message: 'Record synced successfully', recordId };
    } catch (error) {
      console.error('Error syncing record:', error);

      // Update error in database
      const errorQuery = `
        UPDATE sign_ins
        SET sharepoint_sync_error = $1
        WHERE id = $2
      `;
      await pool.query(errorQuery, [error.message, recordId]);

      return { success: false, message: error.message, recordId };
    }
  }

  // Sync all unsynced records
  async syncAllUnsynced() {
    if (!this.enabled) {
      return { success: false, message: 'SharePoint integration is disabled' };
    }

    try {
      // Get all unsynced records
      const query = 'SELECT id FROM sign_ins WHERE sharepoint_synced = false ORDER BY id ASC';
      const result = await pool.query(query);

      const results = {
        total: result.rows.length,
        synced: 0,
        failed: 0,
        details: []
      };

      for (const row of result.rows) {
        const syncResult = await this.syncRecord(row.id);
        if (syncResult.success) {
          results.synced++;
        } else {
          results.failed++;
        }
        results.details.push(syncResult);
      }

      return {
        success: true,
        message: `Synced ${results.synced} of ${results.total} records`,
        results
      };
    } catch (error) {
      console.error('Error syncing all records:', error);
      return { success: false, message: error.message };
    }
  }

  // Read all data from SharePoint Excel
  async readFromSharePoint() {
    if (!this.enabled) {
      return { success: false, message: 'SharePoint integration is disabled' };
    }

    try {
      await this.initialize();

      // Get the Excel file
      const fileResponse = await this.client
        .api(`/sites/${this.siteId}/drives/${this.driveId}/root:${this.excelFilePath}:/content`)
        .get();

      // Load workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileResponse);
      const worksheet = workbook.getWorksheet('Sign-Ins');

      const records = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          records.push({
            id: row.getCell(1).value,
            visitor_type: row.getCell(2).value,
            full_name: row.getCell(3).value,
            phone_number: row.getCell(4).value,
            email: row.getCell(5).value,
            company_name: row.getCell(6).value,
            purpose_of_visit: row.getCell(7).value,
            car_registration: row.getCell(8).value,
            visiting_person: row.getCell(9).value,
            sign_in_time: row.getCell(10).value,
            sign_out_time: row.getCell(11).value,
            status: row.getCell(12).value
          });
        }
      });

      return {
        success: true,
        data: records,
        count: records.length
      };
    } catch (error) {
      console.error('Error reading from SharePoint:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new SharePointService();
