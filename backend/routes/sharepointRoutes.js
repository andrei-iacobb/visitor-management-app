const express = require('express');
const { param, validationResult } = require('express-validator');
const sharepointService = require('../services/sharepointService');

const logger = require('../utils/logger');
const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// POST /api/sharepoint/sync - Sync all unsynced records to SharePoint
router.post('/sync', async (req, res) => {
  try {
    const result = await sharepointService.syncAllUnsynced();

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error syncing to SharePoint', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to sync to SharePoint',
      error: error.message
    });
  }
});

// POST /api/sharepoint/sync/:id - Sync specific record to SharePoint
router.post('/sync/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sharepointService.syncRecord(parseInt(id));

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error syncing record to SharePoint', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to sync record to SharePoint',
      error: error.message
    });
  }
});

// GET /api/sharepoint/read - Read data from SharePoint Excel
router.get('/read', async (req, res) => {
  try {
    const result = await sharepointService.readFromSharePoint();

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error reading from SharePoint', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to read from SharePoint',
      error: error.message
    });
  }
});

// ==================== NEW: Excel → Database Sync Endpoints ====================

// POST /api/v1/sharepoint/sync/contractors/pull - Sync contractors from Excel to DB
router.post('/sync/contractors/pull', async (req, res) => {
  try {
    logger.info('Manual trigger: Syncing contractors from Excel to Database');
    const result = await sharepointService.syncContractorsFromExcel();

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error syncing contractors from Excel', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to sync contractors from Excel',
      error: error.message
    });
  }
});

// POST /api/v1/sharepoint/sync/vehicles/pull - Sync vehicles from Excel to DB
router.post('/sync/vehicles/pull', async (req, res) => {
  try {
    logger.info('Manual trigger: Syncing vehicles from Excel to Database');
    const result = await sharepointService.syncVehiclesFromExcel();

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error syncing vehicles from Excel', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to sync vehicles from Excel',
      error: error.message
    });
  }
});

// POST /api/v1/sharepoint/sync/full - Full bidirectional sync
router.post('/sync/full', async (req, res) => {
  try {
    logger.info('Manual trigger: Full bidirectional sync');
    const result = await sharepointService.syncBidirectional();

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error performing full sync', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to perform full sync',
      error: error.message
    });
  }
});

// GET /api/sharepoint/status - Check SharePoint integration status
router.get('/status', async (req, res) => {
  try {
    const isInitialized = await sharepointService.initialize();

    res.json({
      success: true,
      enabled: sharepointService.enabled,
      initialized: isInitialized,
      configured: !!(sharepointService.tenantId && sharepointService.clientId && sharepointService.clientSecret)
    });
  } catch (error) {
    logger.error('Error checking SharePoint status', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to check SharePoint status',
      error: error.message
    });
  }
});

module.exports = router;
