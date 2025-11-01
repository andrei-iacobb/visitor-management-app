const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET all staff members
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM staff ORDER BY name ASC');
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staff',
            message: error.message
        });
    }
});

// GET single staff member
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM staff WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Staff member not found'
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
            error: 'Failed to fetch staff member',
            message: error.message
        });
    }
});

// POST new staff member
router.post('/', async (req, res) => {
    try {
        const { name, email, department } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Name and email are required'
            });
        }
        
        const query = `
            INSERT INTO staff (name, email, department)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        
        const result = await db.query(query, [name, email, department || null]);
        
        res.status(201).json({
            success: true,
            message: 'Staff member created successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating staff member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create staff member',
            message: error.message
        });
    }
});

module.exports = router;