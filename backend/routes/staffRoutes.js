const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../config/database');

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

// Validation rules for creating staff
const createStaffValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('department')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
];

// GET /api/staff - Get all staff members
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM staff ORDER BY name ASC';
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff members',
      error: error.message
    });
  }
});

// GET /api/staff/:id - Get single staff member
router.get('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM staff WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff member',
      error: error.message
    });
  }
});

// POST /api/staff - Create new staff member
router.post('/', createStaffValidation, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, department } = req.body;

    // Check if email already exists
    const checkQuery = 'SELECT id FROM staff WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Staff member with this email already exists'
      });
    }

    const insertQuery = `
      INSERT INTO staff (name, email, department)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [name, email, department || null];
    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member',
      error: error.message
    });
  }
});

// PUT /api/staff/:id - Update staff member
router.put('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer'),
  ...createStaffValidation
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department } = req.body;

    // Check if staff member exists
    const checkQuery = 'SELECT * FROM staff WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check if email is being changed to one that already exists
    if (email !== checkResult.rows[0].email) {
      const emailCheckQuery = 'SELECT id FROM staff WHERE email = $1 AND id != $2';
      const emailCheckResult = await pool.query(emailCheckQuery, [email, id]);

      if (emailCheckResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Another staff member with this email already exists'
        });
      }
    }

    const updateQuery = `
      UPDATE staff
      SET name = $1, email = $2, department = $3
      WHERE id = $4
      RETURNING *
    `;

    const values = [name, email, department || null, id];
    const result = await pool.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff member',
      error: error.message
    });
  }
});

// DELETE /api/staff/:id - Delete staff member
router.delete('/:id', [
  param('id').isInt().withMessage('ID must be a valid integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM staff WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: 'Staff member deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff member',
      error: error.message
    });
  }
});

module.exports = router;
