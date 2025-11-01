const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
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
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name is required'),
  body('contractor_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
], handleValidationErrors, async (req, res) => {
  try {
    const { company_name, contractor_name } = req.body;

    // Check if contractor/company is approved
    const checkQuery = `
      SELECT id, status, expiry_date, notes
      FROM allowed_contractors
      WHERE LOWER(company_name) = LOWER($1)
        AND (contractor_name IS NULL OR LOWER(contractor_name) = LOWER($2))
      LIMIT 1
    `;

    const result = await pool.query(checkQuery, [company_name, contractor_name || null]);

    if (result.rows.length === 0) {
      // Not found in allowed list - log unauthorized attempt
      await logUnauthorizedAttempt(company_name, contractor_name);

      return res.status(401).json({
        success: false,
        allowed: false,
        reason: 'NOT_ON_APPROVED_LIST',
        message: `${company_name}${contractor_name ? ` (${contractor_name})` : ''} is not on the approved contractors list.`
      });
    }

    const contractor = result.rows[0];

    // Check if status is approved
    if (contractor.status !== 'approved') {
      await logUnauthorizedAttempt(company_name, contractor_name, `Status: ${contractor.status}`);

      return res.status(401).json({
        success: false,
        allowed: false,
        reason: contractor.status === 'pending' ? 'PENDING_APPROVAL' : 'APPROVAL_DENIED',
        message: contractor.status === 'pending'
          ? `${company_name} is pending approval. Please contact administration.`
          : `${company_name} approval has been denied. Please contact administration.`
      });
    }

    // Check if contractor has expired
    if (contractor.expiry_date && new Date(contractor.expiry_date) < new Date()) {
      await logUnauthorizedAttempt(company_name, contractor_name, 'Contractor approval expired');

      return res.status(401).json({
        success: false,
        allowed: false,
        reason: 'APPROVAL_EXPIRED',
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
    console.error('Error verifying contractor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify contractor status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/contractors/approved
 * Get list of all approved contractors (for admin dashboard)
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
          ELSE UPPER(status)
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
    console.error('Error fetching approved contractors:', error);
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
    console.error('Error adding contractor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add contractor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * PUT /api/contractors/:id
 * Update contractor approval status
 */
router.put('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer'),
  body('status')
    .isIn(['approved', 'pending', 'denied'])
    .withMessage('Status must be approved, pending, or denied'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if contractor exists
    const checkQuery = 'SELECT * FROM allowed_contractors WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contractor not found'
      });
    }

    const updateQuery = `
      UPDATE allowed_contractors
      SET status = $1,
          approval_date = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE approval_date END,
          notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [status, notes || null, id]);

    res.json({
      success: true,
      message: 'Contractor status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating contractor:', error);
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
    console.error('Error fetching unauthorized attempts:', error);
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
    console.error('Error deleting contractor:', error);
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
    console.error('Error logging unauthorized attempt:', error);
    // Don't throw - this is a non-critical operation
  }
}

module.exports = router;
