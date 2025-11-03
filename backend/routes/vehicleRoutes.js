const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

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
        console.error('Error checking vehicle status:', error);
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

        // Get vehicle ID
        const vehicleResult = await pool.query(
            'SELECT id FROM vehicles WHERE registration = $1',
            [registration.toUpperCase()]
        );

        if (vehicleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found',
                data: null
            });
        }

        const vehicleId = vehicleResult.rows[0].id;

        // Insert checkout record
        const checkoutResult = await pool.query(
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

        const checkout = checkoutResult.rows[0];

        // Update vehicle status
        await pool.query(
            `UPDATE vehicles
             SET status = 'in_use', last_checkout_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [checkout.id, vehicleId]
        );

        res.status(201).json({
            success: true,
            message: 'Vehicle checked out successfully',
            data: checkout
        });
    } catch (error) {
        console.error('Error checking out vehicle:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /vehicles/checkin
 * Record a vehicle check-in
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

        // Get vehicle ID and last checkout
        const vehicleResult = await pool.query(
            `SELECT id, last_checkout_id FROM vehicles
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

        const { id: vehicleId, last_checkout_id } = vehicleResult.rows[0];

        if (!last_checkout_id) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle is not currently checked out',
                data: null
            });
        }

        // Get the checkout record to validate return mileage
        const checkoutResult = await pool.query(
            'SELECT starting_mileage FROM vehicle_checkouts WHERE id = $1',
            [last_checkout_id]
        );

        if (checkoutResult.rows.length > 0) {
            const startingMileage = checkoutResult.rows[0].starting_mileage;

            // Validate return mileage is not less than starting mileage
            if (return_mileage < startingMileage) {
                return res.status(400).json({
                    success: false,
                    message: `Return mileage (${return_mileage}) cannot be less than starting mileage (${startingMileage})`,
                    data: null
                });
            }

            // Validate trip distance is reasonable (max 1000 miles per trip)
            const distanceTraveled = return_mileage - startingMileage;
            if (distanceTraveled > 1000) {
                return res.status(400).json({
                    success: false,
                    message: `Distance traveled (${distanceTraveled} miles) exceeds maximum single trip of 1000 miles. Please verify mileage.`,
                    data: null
                });
            }
        }

        // Insert checkin record
        const checkinResult = await pool.query(
            `INSERT INTO vehicle_checkins
             (vehicle_id, checkout_id, registration, checkin_date, checkin_time,
              return_mileage, driver_name, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'checked_in')
             RETURNING id, vehicle_id, checkout_id, registration, checkin_date,
                      checkin_time, return_mileage, driver_name, status, created_at`,
            [vehicleId, last_checkout_id, registration.toUpperCase(),
             checkin_date, checkin_time, return_mileage, driver_name]
        );

        const checkin = checkinResult.rows[0];

        // Update vehicle status back to available
        await pool.query(
            `UPDATE vehicles
             SET status = 'available', current_mileage = $1, last_checkout_id = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [return_mileage, vehicleId]
        );

        res.status(201).json({
            success: true,
            message: 'Vehicle checked in successfully',
            data: checkin
        });
    } catch (error) {
        console.error('Error checking in vehicle:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
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
        console.error('Error reporting damage:', error);
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
        console.error('Error retrieving vehicles:', error);
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
        console.error('Error creating vehicle:', error);
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
        const { status, current_mileage } = req.body;

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramNum = 1;

        if (status !== undefined) {
            updateFields.push(`status = $${paramNum++}`);
            values.push(status);
        }

        if (current_mileage !== undefined) {
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
        values.push(id);

        const result = await pool.query(
            `UPDATE vehicles
             SET ${updateFields.join(', ')}
             WHERE id = $${paramNum}
             RETURNING id, registration, status, current_mileage, created_at, updated_at`,
            values
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
            message: 'Vehicle updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating vehicle:', error);
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
        console.error('Error deleting vehicle:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;
