const express = require('express');
const router = express.Router();
const pool = require('../db'); //db pool
const getCarInfo = require('../getCarInfo'); // Function to fetch car info from external HTTP
const verifyToken = require('../middleware/verifyToken');

router.get('/cars', verifyToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.registration, c.status, c.make, c.model, c.year, c.valuation, uc.access_level
            FROM cars c
            JOIN user_cars uc ON c.id = uc.car_id
            WHERE uc.user_id = $1`,
            [req.user.id]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cars' });
    }
});


router.post('/add-car', verifyToken, async (req, res) => {
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
            // Fetch car info from external service
            const carInfo = await getCarInfo(registration);
            if (!carInfo || !carInfo.make || !carInfo.model || !carInfo.year || !carInfo.valuation) {
                return res.status(400).json({ error: 'Car information cannot be fetched, contact admin' });
            }

            // Insert new car if it doesn't exist
            console.log(carInfo);
            const insertResult = await pool.query(
                `INSERT INTO cars (make, model, year, valuation, registration, status)
                VALUES ($1, $2, $3, $4, $5, 'inactive')
                RETURNING id`,
                [carInfo.make, carInfo.model, carInfo.year, carInfo.valuation, registration]
            );
            carId = insertResult.rows[0].id;
        } else {
            carId = carResult.rows[0].id;
        }

        // Check if association already exists
        const assocResult = await pool.query(
            `SELECT 1 FROM user_cars WHERE user_id = $1 AND car_id = $2`,
            [req.user.id, carId]
        );
        if (assocResult.rows.length > 0) {
            return res.status(409).json({ error: 'Car already associated with user' });
        }

        // Associate user with car
        await pool.query(
            `INSERT INTO user_cars (user_id, car_id, access_level)
            VALUES ($1, $2, $3)`,
            [req.user.id, carId, access_level]
        );

        res.status(201).json({ message: 'Car added successfully', carId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add car' });
    }
});


router.delete('/remove-car/:registration', verifyToken, async (req, res) => {
    const { registration } = req.params;
    const userId = req.user.id;

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


router.post('/log-trip', verifyToken, async (req, res) => {
    const { registration, start_mileage, end_mileage, notes, parked_location, started_at, ended_at } = req.body;
    
    if (!registration || typeof start_mileage !== 'number' || typeof end_mileage !== 'number' || end_mileage < start_mileage || !parked_location) {
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
            $1, $2, $3, $4, CAST($5 AS numeric), CAST($6 AS numeric), ((CAST($6 AS numeric) - CAST($5 AS numeric)) / 10.0), $7, $8
            )`,
            [req.user.id, carId, started_at, ended_at, start_mileage, end_mileage, parked_location, notes || '']
        );

        // Optionally update car status or mileage here if needed

        res.status(201).json({ message: 'Trip logged successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to log trip.' });
    }
});

module.exports = router;