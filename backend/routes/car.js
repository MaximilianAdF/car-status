const express = require('express');
const router = express.Router();
const verifySession = require('../middleware/verifySession');
const pool = require('../db'); //db pool

router.post('/cars', verifySession, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.registration, c.status
            FROM cars c
            JOIN user_cars uc ON c.id = uc.car_id
            WHERE uc.user_id = $1`,
            [req.userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cars' });
    }
});


router.post('/add-car', verifySession, async (req, res) => {
    const { registration, access_level } = req.body;
    if (!registration || !access_level) {
        return res.status(400).json({ error: 'Registration and access level are required' });
    }

    try {
        // Check if car already exists
        let carResult = await pool.query(
            `SELECT id FROM cars WHERE registration = $1`,
            [registration]
        );

        let carId;
        if (carResult.rows.length === 0) {
            // Insert new car if it doesn't exist
            const insertResult = await pool.query(
                `INSERT INTO cars (registration, status)
                VALUES ($1, 'inactive')
                RETURNING id`,
                [registration]
            );
            carId = insertResult.rows[0].id;
        } else {
            carId = carResult.rows[0].id;
        }

        // Check if association already exists
        const assocResult = await pool.query(
            `SELECT 1 FROM user_cars WHERE user_id = $1 AND car_id = $2`,
            [req.userId, carId]
        );
        if (assocResult.rows.length > 0) {
            return res.status(409).json({ error: 'Car already associated with user' });
        }

        // Associate user with car
        await pool.query(
            `INSERT INTO user_cars (user_id, car_id, access_level)
            VALUES ($1, $2, $3)`,
            [req.userId, carId, access_level]
        );

        res.status(201).json({ message: 'Car added successfully', carId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add car' });
    }
});


router.delete('/remove-car/:registration', verifySession, async (req, res) => {
    const { registration } = req.params;
    const userId = req.userId;

    try {
        // Get car id by registration
        const carResult = await pool.query(
            `SELECT id FROM cars WHERE registration = $1`,
            [registration]
        );
        if (carResult.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }
        const carId = carResult.rows[0].id;

        // Remove association between user and car
        await pool.query(
            `DELETE FROM user_cars WHERE user_id = $1 AND car_id = $2`,
            [userId, carId]
        );

        // Check if any other users are associated with this car
        const userCarResult = await pool.query(
            `SELECT 1 FROM user_cars WHERE car_id = $1 LIMIT 1`,
            [carId]
        );

        // If no other users, remove car from cars table
        if (userCarResult.rows.length === 0) {
            await pool.query(
                `DELETE FROM cars WHERE id = $1`,
                [carId]
            );
        }

        res.status(200).json({ message: 'Car removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove car' });
    }
});


router.post('/log-trip', verifySession, async (req, res) => {
    const { registration, start_mileage, end_mileage, notes, parked_location } = req.body;
    
    if (!registration || typeof start_mileage !== 'number' || typeof end_mileage !== 'number' || end_mileage < start_mileage) {
        return res.status(400).json({ error: 'Invalid trip data.' });
    }

    try {
        // Get car id by registration
        const carResult = await pool.query(
            `SELECT id FROM cars WHERE registration = $1`,
            [registration]
        );
        if (carResult.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found.' });
        }
        const carId = carResult.rows[0].id;

        // Insert trip log
        await pool.query(
            `INSERT INTO car_usage_log (
            user_id, car_id, started_at, ended_at, start_mileage, end_mileage, fuel_used_liters, parked_location, notes
            ) VALUES (
            $1, $2, NULL, NULL, CAST($3 AS numeric), CAST($4 AS numeric), ((CAST($4 AS numeric) - CAST($3 AS numeric)) / 10.0), $5, $6
            )`,
            [req.userId, carId, start_mileage, end_mileage, parked_location, notes || '']
        );

        // Optionally update car status or mileage here if needed

        res.status(201).json({ message: 'Trip logged successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to log trip.' });
    }
});

module.exports = router;