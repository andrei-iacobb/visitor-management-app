const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /vehicles/list/all
 * Get list of all vehicle registrations (for autocomplete)
 * NOTE: This route must come BEFORE /:registration to avoid route conflict
 */
router.get('/list/all', async (req, res) => {
    try {
        const query = `
            SELECT registration
            FROM vehicles
            ORDER BY registration ASC
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows.map(row => row.registration)
        });
    } catch (error) {
        logger.error('Error fetching vehicle registrations', {
            error: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vehicle registrations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET /vehicles/:registration
 * Check vehicle status by registration
 */
router.get('/:registration', async (req, res) => {
    try {
        const { registration } = req.params;

        // Get vehicle details
        const vehicleResult = await pool.query(
            `SELECT id, registration, status, current_mileage, last_checkout_id
             FROM vehicles
             WHERE registration = $1`,
            [registration.toUpperCase()]
        );

        if (vehicleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found',
                data: null
            });
        }

        const vehicle = vehicleResult.rows[0];

        // Check if vehicle has an active checkout
        let lastCheckout = null;
        if (vehicle.last_checkout_id) {
            const checkoutResult = await pool.query(
                `SELECT id, vehicle_id, registration, checkout_date, checkout_time,
                        company_name, driver_name, starting_mileage, acknowledged_terms,
                        acknowledgment_time, status, created_at
                 FROM vehicle_checkouts
                 WHERE id = $1`,
                [vehicle.last_checkout_id]
            );
            if (checkoutResult.rows.length > 0) {
                lastCheckout = checkoutResult.rows[0];
            }
        }

        const isAvailable = vehicle.status === 'available' && !lastCheckout;

        res.json({
            success: true,
            data: {
                vehicle: {
                    id: vehicle.id,
                    registration: vehicle.registration,
                    status: vehicle.status,
                    current_mileage: vehicle.current_mileage,
                    checkout_id: vehicle.last_checkout_id
                },
                is_available: isAvailable,
                last_checkout: lastCheckout
            }
        });
    } catch (error) {
        logger.error('Error checking vehicle status', {
            error: error.message,
            stack: error.stack,
            registration: req.params.registration
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /vehicles/checkout
 * Record a vehicle checkout
 * Uses transaction with row-level locking to prevent race conditions
 */
router.post('/checkout', async (req, res) => {
    try {
        const {
            registration,
            checkout_date,
            checkout_time,
            company_name,
            driver_name,
            starting_mileage,
            signature,
            acknowledged_terms,
            acknowledgment_time
        } = req.body;

        // Validate required fields
        if (!registration || !checkout_date || !checkout_time || !company_name ||
            !driver_name || starting_mileage === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                data: null
            });
        }

        // Validate mileage is a non-negative integer
        if (!Number.isInteger(starting_mileage) || starting_mileage < 0) {
            return res.status(400).json({
                success: false,
                message: 'Starting mileage must be a non-negative integer',
                data: null
            });
        }

        // Validate mileage is realistic
        if (starting_mileage > 999999) {
            return res.status(400).json({
                success: false,
                message: 'Starting mileage exceeds maximum allowed value (999,999)',
                data: null
            });
        }

        // Use transaction with row-level locking to prevent race conditions
        const { transaction } = require('../config/database');
        const checkout = await transaction(async (client) => {
            // Lock the vehicle row for update to prevent concurrent checkouts
            const vehicleResult = await client.query(
                'SELECT id, status FROM vehicles WHERE registration = $1 FOR UPDATE',
                [registration.toUpperCase()]
            );

            if (vehicleResult.rows.length === 0) {
                throw new Error('Vehicle not found');
            }

            const vehicle = vehicleResult.rows[0];

            // Check if vehicle is already in use
            if (vehicle.status === 'in_use') {
                throw new Error('Vehicle is already checked out');
            }

            if (vehicle.status === 'maintenance') {
                throw new Error('Vehicle is under maintenance and cannot be checked out');
            }

            const vehicleId = vehicle.id;

            // Insert checkout record
            const checkoutResult = await client.query(
                `INSERT INTO vehicle_checkouts
                 (vehicle_id, registration, checkout_date, checkout_time, company_name,
                  driver_name, starting_mileage, signature, acknowledged_terms,
                  acknowledgment_time, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'checked_out')
                 RETURNING id, vehicle_id, registration, checkout_date, checkout_time,
                          company_name, driver_name, starting_mileage, acknowledged_terms,
                          acknowledgment_time, status, created_at`,
                [vehicleId, registration.toUpperCase(), checkout_date, checkout_time,
                 company_name, driver_name, starting_mileage, signature,
                 acknowledged_terms || false, acknowledgment_time]
            );

            const checkoutRecord = checkoutResult.rows[0];

            // Update vehicle status
            await client.query(
                `UPDATE vehicles
                 SET status = 'in_use', last_checkout_id = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [checkoutRecord.id, vehicleId]
            );

            return checkoutRecord;
        });

        res.status(201).json({
            success: true,
            message: 'Vehicle checked out successfully',
            data: checkout
        });
    } catch (error) {
        logger.error('Error checking out vehicle', {
            error: error.message,
            stack: error.stack,
            registration: req.body.registration
        });

        // Return appropriate status code based on error type
        const statusCode = error.message.includes('not found') ? 404 :
                          error.message.includes('already checked out') ||
                          error.message.includes('maintenance') ? 409 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal server error',
            data: null
        });
    }
});

/**
 * POST /vehicles/checkin
 * Record a vehicle check-in
 * Uses transaction with row-level locking to prevent race conditions
 */
router.post('/checkin', async (req, res) => {
    try {
        const {
            registration,
            checkin_date,
            checkin_time,
            return_mileage,
            driver_name
        } = req.body;

        // Validate required fields
        if (!registration || !checkin_date || !checkin_time ||
            return_mileage === undefined || !driver_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                data: null
            });
        }

        // Validate mileage is a non-negative integer
        if (!Number.isInteger(return_mileage) || return_mileage < 0) {
            return res.status(400).json({
                success: false,
                message: 'Return mileage must be a non-negative integer',
                data: null
            });
        }

        // Validate mileage is realistic
        if (return_mileage > 999999) {
            return res.status(400).json({
                success: false,
                message: 'Return mileage exceeds maximum allowed value (999,999)',
                data: null
            });
        }

        // Use transaction with row-level locking to prevent race conditions
        const { transaction } = require('../config/database');
        const checkin = await transaction(async (client) => {
            // Lock the vehicle row for update
            const vehicleResult = await client.query(
                `SELECT id, last_checkout_id, status FROM vehicles
                 WHERE registration = $1 FOR UPDATE`,
                [registration.toUpperCase()]
            );

            if (vehicleResult.rows.length === 0) {
                throw new Error('Vehicle not found');
            }

            const { id: vehicleId, last_checkout_id, status } = vehicleResult.rows[0];

            if (!last_checkout_id) {
                throw new Error('Vehicle is not currently checked out');
            }

            if (status !== 'in_use') {
                throw new Error('Vehicle is not in use');
            }

            // Get the checkout record to validate return mileage
            const checkoutResult = await client.query(
                'SELECT starting_mileage FROM vehicle_checkouts WHERE id = $1',
                [last_checkout_id]
            );

            if (checkoutResult.rows.length > 0) {
                const startingMileage = checkoutResult.rows[0].starting_mileage;

                // Validate return mileage is not less than starting mileage
                if (return_mileage < startingMileage) {
                    throw new Error(`Return mileage (${return_mileage}) cannot be less than starting mileage (${startingMileage})`);
                }

                // Validate trip distance is reasonable (max 1000 miles per trip)
                const distanceTraveled = return_mileage - startingMileage;
                if (distanceTraveled > 1000) {
                    throw new Error(`Distance traveled (${distanceTraveled} miles) exceeds maximum single trip of 1000 miles. Please verify mileage.`);
                }
            }

            // Insert checkin record
            const checkinResult = await client.query(
                `INSERT INTO vehicle_checkins
                 (vehicle_id, checkout_id, registration, checkin_date, checkin_time,
                  return_mileage, driver_name, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'checked_in')
                 RETURNING id, vehicle_id, checkout_id, registration, checkin_date,
                          checkin_time, return_mileage, driver_name, status, created_at`,
                [vehicleId, last_checkout_id, registration.toUpperCase(),
                 checkin_date, checkin_time, return_mileage, driver_name]
            );

            const checkinRecord = checkinResult.rows[0];

            // Update vehicle status back to available
            await client.query(
                `UPDATE vehicles
                 SET status = 'available', current_mileage = $1, last_checkout_id = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [return_mileage, vehicleId]
            );

            return checkinRecord;
        });

        res.status(201).json({
            success: true,
            message: 'Vehicle checked in successfully',
            data: checkin
        });
    } catch (error) {
        logger.error('Error checking in vehicle', {
            error: error.message,
            stack: error.stack,
            registration: req.body.registration
        });

        // Return appropriate status code based on error type
        const statusCode = error.message.includes('not found') ? 404 :
                          error.message.includes('not currently checked out') ||
                          error.message.includes('not in use') ||
                          error.message.includes('mileage') ? 400 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal server error',
            data: null
        });
    }
});

/**
 * POST /vehicles/damage
 * Report vehicle damage
 */
router.post('/damage', async (req, res) => {
    try {
        const {
            checkin_id,
            damage_description,
            damage_photos,
            reported_by_name,
            report_date,
            report_time
        } = req.body;

        // Validate required fields
        if (!checkin_id || !reported_by_name || !report_date || !report_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                data: null
            });
        }

        // Verify checkin exists
        const checkinResult = await pool.query(
            'SELECT id FROM vehicle_checkins WHERE id = $1',
            [checkin_id]
        );

        if (checkinResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Check-in record not found',
                data: null
            });
        }

        // Insert damage report
        const damageResult = await pool.query(
            `INSERT INTO vehicle_damages
             (checkin_id, damage_description, damage_photos, reported_by_name,
              report_date, report_time, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'reported')
             RETURNING id, checkin_id, damage_description, damage_photos,
                      reported_by_name, report_date, report_time, status, created_at`,
            [checkin_id, damage_description || null, damage_photos || null,
             reported_by_name, report_date, report_time]
        );

        const damage = damageResult.rows[0];

        res.status(201).json({
            success: true,
            message: 'Damage report submitted successfully',
            data: damage
        });
    } catch (error) {
        logger.error('Error reporting damage', {
            error: error.message,
            stack: error.stack,
            checkin_id: req.body.checkin_id
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /vehicles
 * Get all vehicles
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, registration, status, current_mileage, last_checkout_id,
                    created_at, updated_at
             FROM vehicles
             ORDER BY registration ASC`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error retrieving vehicles', {
            error: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /vehicles
 * Create a new vehicle
 */
router.post('/', async (req, res) => {
    try {
        const {
            registration,
            status = 'available',
            current_mileage = 0
        } = req.body;

        // Validate required fields
        if (!registration) {
            return res.status(400).json({
                success: false,
                message: 'Registration is required',
                data: null
            });
        }

        // Validate registration doesn't already exist
        const existingVehicle = await pool.query(
            'SELECT id FROM vehicles WHERE registration = $1',
            [registration.toUpperCase()]
        );

        if (existingVehicle.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle with this registration already exists',
                data: null
            });
        }

        const result = await pool.query(
            `INSERT INTO vehicles (registration, status, current_mileage)
             VALUES ($1, $2, $3)
             RETURNING id, registration, status, current_mileage, created_at, updated_at`,
            [registration.toUpperCase(), status, current_mileage]
        );

        res.status(201).json({
            success: true,
            message: 'Vehicle created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creating vehicle', {
            error: error.message,
            stack: error.stack,
            registration: req.body.registration
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /vehicles/:id (by numeric ID)
 * Get a single vehicle by ID
 */
router.get('/id/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID is a number
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vehicle ID format',
                data: null
            });
        }

        const result = await pool.query(
            `SELECT id, registration, status, current_mileage, last_checkout_id, created_at, updated_at
             FROM vehicles
             WHERE id = $1`,
            [parseInt(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found',
                data: null
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error fetching vehicle', {
            error: error.message,
            stack: error.stack,
            id: req.params.id
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * PUT /vehicles/:id
 * Update a vehicle
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { registration, status, current_mileage } = req.body;

        // Validate ID is a number
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vehicle ID format',
                data: null
            });
        }

        // Check if vehicle exists
        const checkResult = await pool.query(
            'SELECT id, registration FROM vehicles WHERE id = $1',
            [parseInt(id)]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found',
                data: null
            });
        }

        // If registration is being updated, check for uniqueness
        if (registration !== undefined && registration.toUpperCase() !== checkResult.rows[0].registration) {
            const dupCheck = await pool.query(
                'SELECT id FROM vehicles WHERE UPPER(registration) = $1',
                [registration.toUpperCase()]
            );
            if (dupCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'A vehicle with this registration already exists',
                    data: null
                });
            }
        }

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramNum = 1;

        if (registration !== undefined) {
            updateFields.push(`registration = $${paramNum++}`);
            values.push(registration.toUpperCase());
        }

        if (status !== undefined) {
            // Validate status value
            if (!['available', 'in_use', 'maintenance'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be one of: available, in_use, maintenance',
                    data: null
                });
            }
            updateFields.push(`status = $${paramNum++}`);
            values.push(status);
        }

        if (current_mileage !== undefined) {
            // Validate mileage
            if (!Number.isInteger(current_mileage) || current_mileage < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Mileage must be a non-negative integer',
                    data: null
                });
            }
            if (current_mileage > 999999) {
                return res.status(400).json({
                    success: false,
                    message: 'Mileage exceeds maximum allowed value (999,999)',
                    data: null
                });
            }
            updateFields.push(`current_mileage = $${paramNum++}`);
            values.push(current_mileage);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                data: null
            });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(parseInt(id));

        const result = await pool.query(
            `UPDATE vehicles
             SET ${updateFields.join(', ')}
             WHERE id = $${paramNum}
             RETURNING id, registration, status, current_mileage, last_checkout_id, created_at, updated_at`,
            values
        );

        res.json({
            success: true,
            message: 'Vehicle updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error updating vehicle', {
            error: error.message,
            stack: error.stack,
            id: req.params.id
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * DELETE /vehicles/:id
 * Delete a vehicle
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM vehicles WHERE id = $1 RETURNING id, registration',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found',
                data: null
            });
        }

        res.json({
            success: true,
            message: 'Vehicle deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error deleting vehicle', {
            error: error.message,
            stack: error.stack,
            id: req.params.id
        });
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;
