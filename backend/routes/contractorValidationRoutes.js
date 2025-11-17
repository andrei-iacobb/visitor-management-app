const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors', { errors: errors.array(), path: req.path, method: req.method });
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// ========================================
// Contractor Validation Endpoints
// ========================================

/**
 * POST /api/contractors/verify
 * Verify if a contractor is allowed to sign in
 * Returns: { allowed: boolean, reason?: string }
 */
router.post('/verify', [
  body('company_name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('contractor_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
], handleValidationErrors, async (req, res) => {
  try {
    const { company_name, contractor_name } = req.body;

    // Search logic: if contractor_name provided, look for exact match (case-insensitive)
    // Otherwise, find any approved contractor under that company (regardless of contractor_name)
    let checkQuery;
    let queryParams;

    if (contractor_name && contractor_name.trim()) {
      // Search for specific contractor under company (both required to match)
      checkQuery = `
        SELECT id, status, expiry_date, notes
        FROM allowed_contractors
        WHERE LOWER(TRIM(company_name)) = LOWER(TRIM($1))
          AND LOWER(TRIM(contractor_name)) = LOWER(TRIM($2))
        LIMIT 1
      `;
      queryParams = [company_name, contractor_name];
    } else {
      // Search for ANY approved contractor under this company
      // This allows company-only registration if they have approved contractors
      checkQuery = `
        SELECT id, status, expiry_date, notes
        FROM allowed_contractors
        WHERE LOWER(TRIM(company_name)) = LOWER(TRIM($1))
        LIMIT 1
      `;
      queryParams = [company_name];
    }

    const result = await pool.query(checkQuery, queryParams);

    if (result.rows.length === 0) {
      // Not found in allowed list - log unauthorized attempt
      await logUnauthorizedAttempt(company_name, contractor_name);

      return res.status(401).json({
        success: false,
        allowed: false,
        message: `${company_name}${contractor_name ? ` (${contractor_name})` : ''} is not on the approved contractors list.`
      });
    }

    const contractor = result.rows[0];

    // Check if status is approved
    if (contractor.status !== 'approved') {
      await logUnauthorizedAttempt(company_name, contractor_name, `Status: ${contractor.status}`);

      const statusMessage = contractor.status === 'pending'
        ? `${company_name} is pending approval. Please contact administration.`
        : `${company_name} approval has been denied. Please contact administration.`;

      return res.status(401).json({
        success: false,
        allowed: false,
        message: statusMessage
      });
    }

    // Check if contractor has expired
    if (contractor.expiry_date && new Date(contractor.expiry_date) < new Date()) {
      await logUnauthorizedAttempt(company_name, contractor_name, 'Contractor approval expired');

      return res.status(401).json({
        success: false,
        allowed: false,
        message: `${company_name}'s approval has expired. Please contact administration to renew.`
      });
    }

    // Contractor is approved and valid
    res.json({
      success: true,
      allowed: true,
      message: 'Contractor is approved to sign in',
      contractorId: contractor.id
    });
  } catch (error) {
    logger.error('Error verifying contractor', { error: error.message, stack: error.stack, company: req.body.company_name });
    res.status(500).json({
      success: false,
      message: 'Failed to verify contractor status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors/companies
 * Get list of distinct company names (for autocomplete)
 */
router.get('/companies', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT company_name
      FROM allowed_contractors
      WHERE status = 'approved'
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_TIMESTAMP)
      ORDER BY company_name ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => row.company_name)
    });
  } catch (error) {
    logger.error('Error fetching company names', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company names',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors/by-company
 * Get approved contractors for a specific company (for contractor selection UI)
 * NOTE: This route must come BEFORE /:id to avoid route conflict
 */
router.get('/by-company', [
  query('company_name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { company_name } = req.query;

    const query = `
      SELECT
        id, company_name, contractor_name, status, expiry_date
      FROM allowed_contractors
      WHERE LOWER(TRIM(company_name)) = LOWER(TRIM($1))
        AND status = 'approved'
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_TIMESTAMP)
      ORDER BY contractor_name ASC
    `;

    const result = await pool.query(query, [company_name]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No approved contractors found for "${company_name}". Please check the company name or contact administration.`
      });
    }

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching contractors by company', { error: error.message, stack: error.stack, company: req.params.company_name });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contractors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors
 * Get list of all contractors (all statuses) - for admin dashboard stats
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT
        id, company_name, contractor_name, email, phone_number,
        status, approval_date, expiry_date, notes
      FROM allowed_contractors
      ORDER BY company_name ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM allowed_contractors');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    logger.error('Error fetching all contractors', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contractors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors/approved
 * Get list of all approved contractors (for sign-in verification)
 */
router.get('/approved', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT
        id, company_name, contractor_name, email, phone_number,
        status, approval_date, expiry_date, notes,
        CASE
          WHEN expiry_date IS NOT NULL AND expiry_date < CURRENT_TIMESTAMP THEN 'EXPIRED'
          WHEN status = 'approved' THEN 'ACTIVE'
          ELSE UPPER(status::text)
        END as approval_status
      FROM allowed_contractors
      WHERE status = 'approved'
      ORDER BY company_name ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM allowed_contractors WHERE status = $1',
      ['approved']
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    logger.error('Error fetching approved contractors', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved contractors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/contractors
 * Add a new contractor to the whitelist (Admin only)
 */
router.post('/', [
  body('company_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name is required'),
  body('contractor_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 }),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format'),
  body('phone_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['approved', 'pending', 'denied'])
    .withMessage('Status must be approved, pending, or denied'),
  body('expiry_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO8601 date'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
], handleValidationErrors, async (req, res) => {
  try {
    const { company_name, contractor_name, email, phone_number, status = 'pending', expiry_date, notes } = req.body;

    // Check if this contractor already exists
    const existingQuery = `
      SELECT id FROM allowed_contractors
      WHERE LOWER(company_name) = LOWER($1)
      AND (contractor_name IS NULL OR LOWER(contractor_name) = LOWER($2))
    `;
    const existingResult = await pool.query(existingQuery, [company_name, contractor_name || null]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This contractor is already in the system'
      });
    }

    const insertQuery = `
      INSERT INTO allowed_contractors
        (company_name, contractor_name, email, phone_number, status, approval_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      company_name,
      contractor_name || null,
      email || null,
      phone_number || null,
      status,
      status === 'approved' ? new Date().toISOString() : null,
      notes || null
    ];

    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Contractor added to approved list',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error adding contractor', { error: error.message, stack: error.stack, company: req.body.company_name });
    res.status(500).json({
      success: false,
      message: 'Failed to add contractor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors/:id
 * Get a single contractor by ID
 */
router.get('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, company_name, contractor_name, email, phone_number,
        status, approval_date, expiry_date, notes, created_at, updated_at
      FROM allowed_contractors
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contractor not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching contractor', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contractor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * PUT /api/contractors/:id
 * Update contractor information
 */
router.put('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer'),
  body('company_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('contractor_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contractor name must not exceed 255 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format'),
  body('phone_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone number must not exceed 50 characters'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['approved', 'pending', 'denied', 'inbuilding'])
    .withMessage('Status must be approved, pending, denied, or inbuilding'),
  body('expiry_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO8601 date'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, contractor_name, email, phone_number, status, expiry_date, notes } = req.body;

    // Check if contractor exists
    const checkQuery = 'SELECT * FROM allowed_contractors WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contractor not found'
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramNum = 1;

    if (company_name !== undefined) {
      updates.push(`company_name = $${paramNum++}`);
      values.push(company_name);
    }

    if (contractor_name !== undefined) {
      updates.push(`contractor_name = $${paramNum++}`);
      values.push(contractor_name || null);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramNum++}`);
      values.push(email || null);
    }

    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramNum++}`);
      values.push(phone_number || null);
    }

    if (status !== undefined) {
      updates.push(`status = $${paramNum++}`);
      values.push(status);
      // Set approval_date when transitioning to approved
      if (status === 'approved') {
        updates.push(`approval_date = CURRENT_TIMESTAMP`);
      }
    }

    if (expiry_date !== undefined) {
      updates.push(`expiry_date = $${paramNum++}`);
      values.push(expiry_date || null);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramNum++}`);
      values.push(notes || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE allowed_contractors
      SET ${updates.join(', ')}
      WHERE id = $${paramNum}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Contractor updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating contractor', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update contractor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors/unauthorized-attempts
 * Get log of unauthorized contractor sign-in attempts (Admin only)
 */
router.get('/unauthorized-attempts', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('days').optional().isInt({ min: 1, max: 365 }).toInt()
], handleValidationErrors, async (req, res) => {
  try {
    const { limit = 50, offset = 0, days = 30 } = req.query;

    const query = `
      SELECT
        id, company_name, contractor_name, phone_number, email,
        reason, attempt_time
      FROM unauthorized_attempts
      WHERE attempt_time > CURRENT_TIMESTAMP - INTERVAL '1 day' * $3
      ORDER BY attempt_time DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset, days]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM unauthorized_attempts
      WHERE attempt_time > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
    `;
    const countResult = await pool.query(countQuery, [days]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    logger.error('Error fetching unauthorized attempts', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unauthorized attempts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * DELETE /api/contractors/:id
 * Remove a contractor from the approved list
 */
router.delete('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM allowed_contractors WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contractor not found'
      });
    }

    res.json({
      success: true,
      message: 'Contractor removed from approved list',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error deleting contractor', { error: error.message, stack: error.stack, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to delete contractor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ========================================
// Helper Functions
// ========================================

/**
 * Log unauthorized contractor sign-in attempt
 */
async function logUnauthorizedAttempt(companyName, contractorName, reason = 'Not on approved list') {
  try {
    const logQuery = `
      INSERT INTO unauthorized_attempts (company_name, contractor_name, reason)
      VALUES ($1, $2, $3)
    `;
    await pool.query(logQuery, [companyName, contractorName || 'N/A', reason]);
  } catch (error) {
    logger.error('Error logging unauthorized attempt', { error: error.message, stack: error.stack });
    // Don't throw - this is a non-critical operation
  }
}

module.exports = router;
