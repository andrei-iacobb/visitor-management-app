#!/usr/bin/env node

/**
 * Data Archival Script
 *
 * Archives old visitor sign-in records and vehicle checkout records
 * to archive tables to prevent database growth and maintain performance.
 *
 * Usage:
 *   node scripts/archive-old-records.js [--retention-days=90] [--dry-run]
 *
 * Options:
 *   --retention-days=N  Number of days to retain in main tables (default: 90)
 *   --dry-run           Show what would be archived without actually archiving
 *   --help              Show this help message
 */

require('dotenv').config();
const { pool, closePool } = require('../config/database');
const logger = require('../utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const retentionDays = parseInt(
    args.find(arg => arg.startsWith('--retention-days='))?.split('=')[1] || '90'
);
const dryRun = args.includes('--dry-run');
const showHelp = args.includes('--help');

if (showHelp) {
    console.log(`
Data Archival Script
====================

Archives old visitor sign-in records and vehicle checkout records to archive tables.

Usage:
  node scripts/archive-old-records.js [options]

Options:
  --retention-days=N    Number of days to retain in main tables (default: 90)
  --dry-run             Show what would be archived without actually archiving
  --help                Show this help message

Examples:
  # Archive records older than 90 days (default)
  node scripts/archive-old-records.js

  # Archive records older than 180 days
  node scripts/archive-old-records.js --retention-days=180

  # Dry run to see what would be archived
  node scripts/archive-old-records.js --dry-run

Environment Variables:
  ARCHIVAL_RETENTION_DAYS  Default retention period (overridden by --retention-days)
  DB_HOST                 Database host
  DB_NAME                 Database name
  DB_USER                 Database user
  DB_PASSWORD             Database password
    `);
    process.exit(0);
}

/**
 * Archive sign-in records
 */
async function archiveSignIns(cutoffDate) {
    try {
        // First, count records to be archived
        const countResult = await pool.query(
            `SELECT COUNT(*) as count
             FROM sign_ins
             WHERE created_at < $1`,
            [cutoffDate]
        );

        const totalRecords = parseInt(countResult.rows[0].count);

        if (totalRecords === 0) {
            logger.info('No sign-in records to archive');
            return { archived: 0, errors: 0 };
        }

        logger.info(`Found ${totalRecords} sign-in records to archive (older than ${cutoffDate.toISOString()})`);

        if (dryRun) {
            logger.info('[DRY RUN] Would archive sign-in records, but skipping actual archival');
            return { archived: totalRecords, errors: 0, dryRun: true };
        }

        // Archive records in a transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert into archive table
            const archiveResult = await client.query(
                `INSERT INTO sign_ins_archive
                 (id, visitor_type, full_name, phone_number, email, company_name,
                  purpose_of_visit, car_registration, visiting_person, sign_in_time,
                  sign_out_time, status, signature, sharepoint_synced, sharepoint_sync_time,
                  sharepoint_sync_error, document_acknowledged, document_acknowledgment_time,
                  created_at, updated_at, archived_at)
                 SELECT
                  id, visitor_type, full_name, phone_number, email, company_name,
                  purpose_of_visit, car_registration, visiting_person, sign_in_time,
                  sign_out_time, status, signature, sharepoint_synced, sharepoint_sync_time,
                  sharepoint_sync_error, document_acknowledged, document_acknowledgment_time,
                  created_at, updated_at, CURRENT_TIMESTAMP
                 FROM sign_ins
                 WHERE created_at < $1
                 ON CONFLICT (id) DO NOTHING`,  // Prevent duplicates
                [cutoffDate]
            );

            const archivedCount = archiveResult.rowCount;

            // Delete from main table
            const deleteResult = await client.query(
                `DELETE FROM sign_ins WHERE created_at < $1`,
                [cutoffDate]
            );

            const deletedCount = deleteResult.rowCount;

            await client.query('COMMIT');

            logger.info('Sign-in archival completed', {
                totalRecords,
                archivedCount,
                deletedCount,
                cutoffDate: cutoffDate.toISOString()
            });

            return { archived: archivedCount, errors: totalRecords - archivedCount };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Error archiving sign-in records', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Archive vehicle checkout records
 */
async function archiveVehicleCheckouts(cutoffDate) {
    try {
        // Count records to be archived
        const countResult = await pool.query(
            `SELECT COUNT(*) as count
             FROM vehicle_checkouts vc
             LEFT JOIN vehicle_checkins ci ON vc.id = ci.checkout_id
             WHERE vc.created_at < $1
               AND (ci.id IS NOT NULL OR vc.status = 'completed')`,  // Only archive if checked in or completed
            [cutoffDate]
        );

        const totalRecords = parseInt(countResult.rows[0].count);

        if (totalRecords === 0) {
            logger.info('No vehicle checkout records to archive');
            return { archived: 0, errors: 0 };
        }

        logger.info(`Found ${totalRecords} vehicle checkout records to archive (older than ${cutoffDate.toISOString()})`);

        if (dryRun) {
            logger.info('[DRY RUN] Would archive vehicle checkout records, but skipping actual archival');
            return { archived: totalRecords, errors: 0, dryRun: true };
        }

        // Archive records in a transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert into archive table
            const archiveResult = await client.query(
                `INSERT INTO vehicle_checkouts_archive
                 (id, vehicle_id, registration, checkout_date, checkout_time,
                  company_name, driver_name, starting_mileage, signature,
                  acknowledged_terms, acknowledgment_time, status, created_at, updated_at, archived_at)
                 SELECT
                  id, vehicle_id, registration, checkout_date, checkout_time,
                  company_name, driver_name, starting_mileage, signature,
                  acknowledged_terms, acknowledgment_time, status, created_at, updated_at, CURRENT_TIMESTAMP
                 FROM vehicle_checkouts vc
                 LEFT JOIN vehicle_checkins ci ON vc.id = ci.checkout_id
                 WHERE vc.created_at < $1
                   AND (ci.id IS NOT NULL OR vc.status = 'completed')
                 ON CONFLICT (id) DO NOTHING`,
                [cutoffDate]
            );

            const archivedCount = archiveResult.rowCount;

            // Delete from main table
            const deleteResult = await client.query(
                `DELETE FROM vehicle_checkouts
                 WHERE id IN (
                   SELECT vc.id FROM vehicle_checkouts vc
                   LEFT JOIN vehicle_checkins ci ON vc.id = ci.checkout_id
                   WHERE vc.created_at < $1
                     AND (ci.id IS NOT NULL OR vc.status = 'completed')
                 )`,
                [cutoffDate]
            );

            const deletedCount = deleteResult.rowCount;

            await client.query('COMMIT');

            logger.info('Vehicle checkout archival completed', {
                totalRecords,
                archivedCount,
                deletedCount,
                cutoffDate: cutoffDate.toISOString()
            });

            return { archived: archivedCount, errors: totalRecords - archivedCount };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Error archiving vehicle checkout records', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Update data retention policy
 */
async function updateRetentionPolicy(retentionDays) {
    try {
        await pool.query(
            `INSERT INTO data_retention_policy (table_name, retention_days, last_archival_run)
             VALUES ('sign_ins', $1, CURRENT_TIMESTAMP)
             ON CONFLICT (table_name)
             DO UPDATE SET
               retention_days = $1,
               last_archival_run = CURRENT_TIMESTAMP`,
            [retentionDays]
        );

        await pool.query(
            `INSERT INTO data_retention_policy (table_name, retention_days, last_archival_run)
             VALUES ('vehicle_checkouts', $1, CURRENT_TIMESTAMP)
             ON CONFLICT (table_name)
             DO UPDATE SET
               retention_days = $1,
               last_archival_run = CURRENT_TIMESTAMP`,
            [retentionDays]
        );

        logger.info('Data retention policy updated', { retentionDays });
    } catch (error) {
        logger.error('Error updating retention policy', {
            error: error.message,
            stack: error.stack
        });
        // Don't throw - this is not critical
    }
}

/**
 * Main archival function
 */
async function runArchival() {
    const startTime = Date.now();

    logger.info('========================================');
    logger.info('📦 Data Archival Script Started');
    logger.info('========================================');
    logger.info('Configuration', {
        retentionDays,
        dryRun,
        cutoffDate: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
    });

    try {
        // Calculate cutoff date
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        // Archive sign-ins
        logger.info('Starting sign-in archival...');
        const signInResult = await archiveSignIns(cutoffDate);

        // Archive vehicle checkouts
        logger.info('Starting vehicle checkout archival...');
        const vehicleResult = await archiveVehicleCheckouts(cutoffDate);

        // Update retention policy (if not dry run)
        if (!dryRun) {
            await updateRetentionPolicy(retentionDays);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        logger.info('========================================');
        logger.info('✅ Data Archival Completed Successfully');
        logger.info('========================================');
        logger.info('Summary', {
            signInsArchived: signInResult.archived,
            vehicleCheckoutsArchived: vehicleResult.archived,
            totalArchived: signInResult.archived + vehicleResult.archived,
            errors: signInResult.errors + vehicleResult.errors,
            duration: `${duration}s`,
            dryRun: dryRun || false
        });

        if (dryRun) {
            logger.warn('DRY RUN MODE - No data was actually archived');
        }

        process.exit(0);

    } catch (error) {
        logger.error('========================================');
        logger.error('❌ Data Archival Failed');
        logger.error('========================================');
        logger.error('Fatal error during archival', {
            error: error.message,
            stack: error.stack,
            duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        });

        process.exit(1);
    } finally {
        // Close database connection
        await closePool();
    }
}

// Run archival
runArchival();
