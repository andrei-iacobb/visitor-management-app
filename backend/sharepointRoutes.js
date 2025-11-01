const express = require('express');
const router = express.Router();
const db = require('../config/database');
const sharepointService = require('../services/sharepointService');

// Sync all unsynced records to SharePoint
router.post('/sync', async (req, res) => {
    try {
        // Get all records that haven't been synced
        const result = await db.query(
            'SELECT * FROM sign_ins WHERE synced_to_sharepoint = FALSE ORDER BY sign_in_time DESC'
        );
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No records to sync',
                synced: 0
            });
        }
        
        // Sync to SharePoint
        const syncResult = await sharepointService.syncToSharePoint(result.rows);
        
        // Mark records as synced
        const ids = result.rows.map(row => row.id);
        await db.query(
            `UPDATE sign_ins 
             SET synced_to_sharepoint = TRUE, 
                 sharepoint_sync_time = CURRENT_TIMESTAMP 
             WHERE id = ANY($1)`,
            [ids]
        );
        
        res.json({
            success: true,
            message: 'Records synced successfully',
            synced: result.rows.length,
            details: syncResult
        });
        
    } catch (error) {
        console.error('Error syncing to SharePoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync to SharePoint',
            message: error.message
        });
    }
});

// Read data from SharePoint Excel
router.get('/read', async (req, res) => {
    try {
        const data = await sharepointService.readFromSharePoint();
        
        res.json({
            success: true,
            message: 'Data read from SharePoint successfully',
            data: data
        });
        
    } catch (error) {
        console.error('Error reading from SharePoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read from SharePoint',
            message: error.message
        });
    }
});

// Manual sync for specific record
router.post('/sync/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query('SELECT * FROM sign_ins WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Record not found'
            });
        }
        
        await sharepointService.syncToSharePoint([result.rows[0]]);
        
        await db.query(
            `UPDATE sign_ins 
             SET synced_to_sharepoint = TRUE, 
                 sharepoint_sync_time = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );
        
        res.json({
            success: true,
            message: 'Record synced to SharePoint successfully'
        });
        
    } catch (error) {
        console.error('Error syncing record to SharePoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync record',
            message: error.message
        });
    }
});

module.exports = router;