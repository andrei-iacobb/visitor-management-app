const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
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
    this.contractorsExcelPath = process.env.CONTRACTORS_EXCEL_PATH;
    this.vehiclesExcelPath = process.env.VEHICLES_EXCEL_PATH;
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

  // ==================== NEW: Excel → Database Sync ====================

  /**
   * Download Excel file from SharePoint
   * @param {string} filePath - Path to Excel file (e.g., /VisitorManagement/AllowedContractors.xlsx)
   * @returns {Buffer} - Excel file buffer
   */
  async downloadExcelFile(filePath) {
    if (!this.client) {
      throw new Error('SharePoint client not initialized');
    }

    try {
      logger.info(`Downloading Excel file from SharePoint: ${filePath}`);

      // Get the file as a stream
      const stream = await this.client
        .api(`/drives/${this.driveId}/root:${filePath}:/content`)
        .getStream();

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info(`Successfully downloaded Excel file: ${filePath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      logger.error(`Failed to download Excel file: ${filePath}`, { error: error.message });
      throw new Error(`Failed to download ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse Excel buffer to JSON array using column mapping
   * @param {Buffer} buffer - Excel file buffer
   * @param {string} sheetName - Name of the worksheet (default: first sheet)
   * @param {Object} mapping - Column header to database field mapping
   * @returns {Array} - Array of parsed records
   */
  async parseExcelToJSON(buffer, sheetName = null, mapping = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];

      if (!worksheet) {
        throw new Error(`Worksheet "${sheetName}" not found`);
      }

      const records = [];
      const headers = [];

      // Read headers from first row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim();
      });

      logger.info(`Parsing Excel with headers: ${headers.filter(h => h).join(', ')}`);

      // Parse data rows (starting from row 2)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const record = {};
        let hasData = false;

        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header && mapping[header]) {
            const dbField = mapping[header];
            const value = cell.value;

            // Handle different cell value types
            if (value !== null && value !== undefined) {
              record[dbField] = value.toString().trim();
              hasData = true;
            }
          }
        });

        // Only add record if it has at least one field with data
        if (hasData) {
          records.push(record);
        }
      });

      logger.info(`Parsed ${records.length} records from Excel`);
      return records;
    } catch (error) {
      logger.error('Failed to parse Excel to JSON', { error: error.message });
      throw new Error(`Failed to parse Excel: ${error.message}`);
    }
  }

  /**
   * Sync contractors from Excel to Database (Excel → DB)
   * Upsert strategy: INSERT if new, UPDATE if exists
   */
  async syncContractorsFromExcel() {
    if (!this.enabled) {
      return { success: false, message: 'SharePoint integration is disabled' };
    }

    try {
      await this.initialize();

      logger.info('Starting contractors sync from Excel to Database...');

      // Column mapping: Excel header → Database field
      const mapping = {
        'Company Name': 'company_name',
        'Contractor Name': 'contractor_name',
        'Email': 'email',
        'Phone Number': 'phone_number',
        'Status': 'status',
        'Notes': 'notes'
      };

      // Download and parse Excel file
      const buffer = await this.downloadExcelFile(this.contractorsExcelPath);
      const records = await this.parseExcelToJSON(buffer, null, mapping);

      if (records.length === 0) {
        return {
          success: true,
          message: 'No contractor records found in Excel',
          stats: { inserted: 0, updated: 0, errors: 0 }
        };
      }

      const stats = { inserted: 0, updated: 0, errors: 0, errorDetails: [] };

      // Upsert each record
      for (const record of records) {
        try {
          // Validate required fields
          if (!record.company_name) {
            throw new Error('Missing required field: company_name');
          }

          // Validate status enum
          const validStatuses = ['approved', 'pending', 'denied'];
          if (record.status && !validStatuses.includes(record.status.toLowerCase())) {
            throw new Error(`Invalid status: ${record.status}. Must be: approved, pending, or denied`);
          }

          // Upsert query (INSERT or UPDATE)
          const query = `
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
            RETURNING (xmax = 0) AS inserted
          `;

          const values = [
            record.company_name,
            record.contractor_name || null,
            record.email || null,
            record.phone_number || null,
            record.status ? record.status.toLowerCase() : 'pending',
            record.notes || null
          ];

          const result = await pool.query(query, values);

          // Check if it was an INSERT (xmax = 0) or UPDATE (xmax > 0)
          if (result.rows[0].inserted) {
            stats.inserted++;
          } else {
            stats.updated++;
          }

          logger.info(`Upserted contractor: ${record.company_name} - ${record.contractor_name || 'N/A'}`);
        } catch (error) {
          stats.errors++;
          stats.errorDetails.push({
            record,
            error: error.message
          });
          logger.error(`Failed to upsert contractor`, { record, error: error.message });
        }
      }

      const message = `Contractors sync completed: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors} errors`;
      logger.info(message, stats);

      return {
        success: true,
        message,
        stats
      };
    } catch (error) {
      logger.error('Contractors sync failed', { error: error.message, stack: error.stack });
      return {
        success: false,
        message: `Contractors sync failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Sync vehicles from Excel to Database (Excel → DB)
   * Upsert strategy: INSERT if new, UPDATE if exists
   */
  async syncVehiclesFromExcel() {
    if (!this.enabled) {
      return { success: false, message: 'SharePoint integration is disabled' };
    }

    try {
      await this.initialize();

      logger.info('Starting vehicles sync from Excel to Database...');

      // Column mapping: Excel header → Database field
      const mapping = {
        'Registration': 'registration',
        'Make': 'make',
        'Model': 'model',
        'Year': 'year',
        'Status': 'status',
        'Current Mileage': 'current_mileage',
        'Notes': 'notes'
      };

      // Download and parse Excel file
      const buffer = await this.downloadExcelFile(this.vehiclesExcelPath);
      const records = await this.parseExcelToJSON(buffer, null, mapping);

      if (records.length === 0) {
        return {
          success: true,
          message: 'No vehicle records found in Excel',
          stats: { inserted: 0, updated: 0, errors: 0 }
        };
      }

      const stats = { inserted: 0, updated: 0, errors: 0, errorDetails: [] };

      // Upsert each record
      for (const record of records) {
        try {
          // Validate required fields
          if (!record.registration) {
            throw new Error('Missing required field: registration');
          }

          // Validate status enum
          const validStatuses = ['available', 'in_use', 'maintenance'];
          if (record.status && !validStatuses.includes(record.status.toLowerCase())) {
            throw new Error(`Invalid status: ${record.status}. Must be: available, in_use, or maintenance`);
          }

          // Parse numeric fields
          const year = record.year ? parseInt(record.year) : null;
          const mileage = record.current_mileage ? parseInt(record.current_mileage.toString().replace(/,/g, '')) : null;

          // Upsert query (INSERT or UPDATE)
          const query = `
            INSERT INTO vehicles (
              registration, make, model, year, status, current_mileage, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (registration)
            DO UPDATE SET
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              status = EXCLUDED.status,
              current_mileage = EXCLUDED.current_mileage,
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          const values = [
            record.registration.toUpperCase(),
            record.make || null,
            record.model || null,
            year,
            record.status ? record.status.toLowerCase() : 'available',
            mileage,
            record.notes || null
          ];

          const result = await pool.query(query, values);

          // Check if it was an INSERT (xmax = 0) or UPDATE (xmax > 0)
          if (result.rows[0].inserted) {
            stats.inserted++;
          } else {
            stats.updated++;
          }

          logger.info(`Upserted vehicle: ${record.registration}`);
        } catch (error) {
          stats.errors++;
          stats.errorDetails.push({
            record,
            error: error.message
          });
          logger.error(`Failed to upsert vehicle`, { record, error: error.message });
        }
      }

      const message = `Vehicles sync completed: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors} errors`;
      logger.info(message, stats);

      return {
        success: true,
        message,
        stats
      };
    } catch (error) {
      logger.error('Vehicles sync failed', { error: error.message, stack: error.stack });
      return {
        success: false,
        message: `Vehicles sync failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Bidirectional sync: Excel → DB → Excel
   * Pull data from Excel files and push current DB state back
   */
  async syncBidirectional() {
    if (!this.enabled) {
      return { success: false, message: 'SharePoint integration is disabled' };
    }

    try {
      logger.info('Starting bidirectional sync...');
      const startTime = Date.now();

      // Phase 1: Pull from Excel → DB
      const contractorsPull = await this.syncContractorsFromExcel();
      const vehiclesPull = await this.syncVehiclesFromExcel();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      const result = {
        success: true,
        message: 'Bidirectional sync completed',
        data: {
          contractors: {
            pull: contractorsPull.stats || { inserted: 0, updated: 0, errors: 0 }
          },
          vehicles: {
            pull: vehiclesPull.stats || { inserted: 0, updated: 0, errors: 0 }
          },
          duration: `${duration}s`,
          timestamp: new Date().toISOString()
        }
      };

      logger.info('Bidirectional sync completed', result.data);
      return result;
    } catch (error) {
      logger.error('Bidirectional sync failed', { error: error.message, stack: error.stack });
      return {
        success: false,
        message: `Bidirectional sync failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new SharePointService();
