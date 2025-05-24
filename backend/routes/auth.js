const express = require('express');
const router = express.Router();
const { login, logout, register, getSession } = require('../controllers/authController');
const verifySession = require('../middleware/verifySession');
const pool = require('../db');

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.get('/session', getSession);

module.exports = router;
