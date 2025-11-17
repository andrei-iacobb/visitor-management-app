const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors', {
      errors: errors.array(),
      requestBody: req.body,
      path: req.path,
      method: req.method
    });
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for creating a sign-in
const createSignInValidation = [
  body('visitor_type')
    .isIn(['visitor', 'contractor'])
    .withMessage('Visitor type must be either "visitor" or "contractor"'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),
  body('phone_number')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Phone number is required'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format'),
  body('company_name')
    .if(() => true) // Always validate for contractors
    .trim()
    .custom((value, { req }) => {
      // Company name is required for contractors
      if (req.body.visitor_type === 'contractor') {
        if (!value || value.trim().length === 0) {
          throw new Error('Company name is required for contractors');
        }
        if (value.trim().length < 2 || value.length > 255) {
          throw new Error('Company name must be between 2 and 255 characters');
        }
      }
      return true;
    }),
  body('purpose_of_visit')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Purpose of visit is required'),
  body('car_registration')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }),
  body('visiting_person')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Visiting person is required')
];

// POST /api/sign-ins - Create new sign-in
router.post('/', createSignInValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      visitor_type,
      full_name,
      phone_number,
      email,
      company_name,
      purpose_of_visit,
      car_registration,
      visiting_person,
      document_acknowledged,
      document_acknowledgment_time
    } = req.body;

    const query = `
      INSERT INTO sign_ins (
        visitor_type, full_name, phone_number, email, company_name,
        purpose_of_visit, car_registration, visiting_person,
        document_acknowledged, document_acknowledgment_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      visitor_type,
      full_name,
      phone_number,
      email || null,
      company_name || null,
      purpose_of_visit,
      car_registration || null,
      visiting_person,
      document_acknowledged || false,
      document_acknowledgment_time || null
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Sign-in created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating sign-in', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create sign-in',
      error: error.message
    });
  }
});

// GET /api/sign-ins - Get all sign-ins with filters
router.get('/', [
  query('status').optional().isIn(['signed_in', 'signed_out']),
  query('visitor_type').optional().isIn(['visitor', 'contractor']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
], handleValidationErrors, async (req, res) => {
  try {
    const { status, visitor_type, limit = 50, offset = 0 } = req.query;

    let queryText = 'SELECT * FROM sign_ins WHERE 1=1';
    const queryParams = [];
    let paramCount = 1;

    if (status) {
      queryText += ` AND status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    if (visitor_type) {
      queryText += ` AND visitor_type = $${paramCount}`;
      queryParams.push(visitor_type);
      paramCount++;
    }

    queryText += ` ORDER BY sign_in_time DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM sign_ins WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (visitor_type) {
      countQuery += ` AND visitor_type = $${countParamIndex}`;
      countParams.push(visitor_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    logger.error('Error fetching sign-ins', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sign-ins',
      error: error.message
    });
  }
});

// GET /api/sign-ins/status/active - Get currently signed-in visitors
router.get('/status/active', async (req, res) => {
  try {
    const query = `
      SELECT
        id, visitor_type, full_name, phone_number, email, company_name,
        purpose_of_visit, car_registration, visiting_person, sign_in_time,
        photo, signature,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sign_in_time))/3600 AS hours_on_site
      FROM sign_ins
      WHERE status = 'signed_in'
      ORDER BY sign_in_time DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching active visitors', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active visitors',
      error: error.message
    });
  }
});

// GET /api/sign-ins/:id - Get single sign-in
router.get('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM sign_ins WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sign-in not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching sign-in', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      id: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sign-in',
      error: error.message
    });
  }
});

// PUT /api/sign-ins/:id/sign-out - Sign out a visitor
router.put('/:id/sign-out', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // First check if the sign-in exists and is currently signed in
    const checkQuery = 'SELECT * FROM sign_ins WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sign-in not found'
      });
    }

    if (checkResult.rows[0].status === 'signed_out') {
      return res.status(400).json({
        success: false,
        message: 'Visitor is already signed out'
      });
    }

    // Update to signed out
    const updateQuery = `
      UPDATE sign_ins
      SET status = 'signed_out', sign_out_time = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [id]);

    res.json({
      success: true,
      message: 'Visitor signed out successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error signing out visitor', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      id: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to sign out visitor',
      error: error.message
    });
  }
});

// DELETE /api/sign-ins/:id - Delete a sign-in record
router.delete('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM sign_ins WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sign-in not found'
      });
    }

    res.json({
      success: true,
      message: 'Sign-in deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error deleting sign-in', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      id: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete sign-in',
      error: error.message
    });
  }
});

module.exports = router;
