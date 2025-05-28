// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, logout, refreshTokenController, getCurrentUser } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken'); // Your new JWT verification middleware

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshTokenController); // New route for refreshing access token
router.post('/logout', logout); // Could also be GET or use verifyToken if needed for specific logic
router.get('/me', verifyToken, getCurrentUser);

module.exports = router;