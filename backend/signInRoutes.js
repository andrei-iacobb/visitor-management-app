const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateSignIn = [
    body('visitor_type').isIn(['visitor', 'contractor']).withMessage('Visitor type must be visitor or contractor'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('company').optional().trim(),
    body('purpose').optional().trim(),
    body('car_registration').optional().trim(),
    body('visiting_person').optional().trim(),
    body('photo').optional().trim(), // base64 string
    body('signature').optional().trim(), // base64 string
];

// GET all sign-ins
router.get('/', async (req, res) => {
    try {
        const { status, visitor_type, limit = 100, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM sign_ins WHERE 1=1';
        const params = [];
        let paramCount = 0;
        
        if (status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(status);
        }
        
        if (visitor_type) {
            paramCount++;
            query += ` AND visitor_type = $${paramCount}`;
            params.push(visitor_type);
        }
        
        query += ` ORDER BY sign_in_time DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching sign-ins:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sign-ins',
            message: error.message
        });
    }
});

// GET single sign-in by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM sign_ins WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sign-in record not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching sign-in:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sign-in',
            message: error.message
        });
    }
});

// GET currently signed-in visitors/contractors
router.get('/status/active', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM sign_ins WHERE status = $1 ORDER BY sign_in_time DESC',
            ['signed_in']
        );
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching active sign-ins:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active sign-ins',
            message: error.message
        });
    }
});

// POST new sign-in
router.post('/', validateSignIn, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const {
            visitor_type,
            full_name,
            phone,
            email,
            company,
            purpose,
            car_registration,
            visiting_person,
            photo,
            signature
        } = req.body;
        
        const query = `
            INSERT INTO sign_ins (
                visitor_type, full_name, phone, email, company, 
                purpose, car_registration, visiting_person,
                photo_path, signature_path, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const values = [
            visitor_type,
            full_name,
            phone,
            email || null,
            company || null,
            purpose || null,
            car_registration || null,
            visiting_person || null,
            photo || null, // In production, save to file and store path
            signature || null, // In production, save to file and store path
            'signed_in'
        ];
        
        const result = await db.query(query, values);
        
        res.status(201).json({
            success: true,
            message: 'Sign-in recorded successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating sign-in:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create sign-in',
            message: error.message
        });
    }
});

// PUT sign-out (update existing sign-in)
router.put('/:id/sign-out', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE sign_ins 
            SET sign_out_time = CURRENT_TIMESTAMP, 
                status = 'signed_out',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'signed_in'
            RETURNING *
        `;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sign-in record not found or already signed out'
            });
        }
        
        res.json({
            success: true,
            message: 'Signed out successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error signing out:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sign out',
            message: error.message
        });
    }
});

// DELETE sign-in record (soft delete or hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query('DELETE FROM sign_ins WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sign-in record not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Sign-in record deleted successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error deleting sign-in:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete sign-in',
            message: error.message
        });
    }
});

module.exports = router;