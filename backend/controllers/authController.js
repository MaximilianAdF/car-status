// controllers/authController.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // Still useful for opaque refresh tokens if not JWTs
const jwt = require('jsonwebtoken');
const pool = require('../db');

const generateTokens = (userPayload) => {
  const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRATION
  });
  const refreshToken = jwt.sign(userPayload, process.env.JWT_REFRESH_SECRET, { // Refresh token is also a JWT
    expiresIn: process.env.REFRESH_TOKEN_EXPIRATION
  });
  return { accessToken, refreshToken };
};

const setRefreshTokenCookie = (res, token, rememberMe = false) => {
  const maxAge = rememberMe
    ? parseInt(process.env.REFRESH_REMEMBER_ME_EXPIRATION * 24 * 60 * 60 * 1000) // e.g., 30 days in ms
    : parseInt(process.env.REFRESH_TOKEN_EXPIRATION * 24 * 60 * 60 * 1000); // e.g., 7 days in ms

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax', // Assuming same-origin setup on Vercel as discussed
    path: '/api/auth', // Scope cookie to auth paths, esp. /refresh-token
    maxAge: maxAge,
  });
};


const register = async (req, res) => {
  const { first_name, last_name, pass, rememberMe } = req.body; // Assuming rememberMe might come from register
  const email = req.body.email ? req.body.email.toLowerCase() : null;

  if (!email || !pass) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hashedPass = await bcrypt.hash(pass, 10);

    // We don't need to store session_id on user record for JWT approach like before.
    // If you want to store refresh tokens server-side for invalidation, that's a separate mechanism.
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, pass)
       VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name`, // Removed session_id
      [first_name, last_name, email, hashedPass]
    );
    const user = result.rows[0];
    const userPayload = { id: user.id, email: user.email }; // Payload for JWT

    const { accessToken, refreshToken } = generateTokens(userPayload);
    setRefreshTokenCookie(res, refreshToken, rememberMe);

    res.status(201).json({
      message: 'User created',
      accessToken,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { pass, rememberMe } = req.body; // rememberMe from login form
  const email = req.body.email ? req.body.email.toLowerCase() : null;

  if (!email || !pass) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(pass, user.pass);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    // Don't need to update session_id in users table anymore for this flow
    const userPayload = { id: user.id, email: user.email };
    const { accessToken, refreshToken } = generateTokens(userPayload);

    // The 'long_token' logic from your old code is now 'rememberMe'
    setRefreshTokenCookie(res, refreshToken, rememberMe);

    console.log(`[POST /api/auth/login] User ${user.email} logged in. Access token issued.`);
    res.json({
      message: 'Login successful',
      accessToken,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const refreshTokenController = async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  console.log('[POST /api/auth/refresh-token] Incoming refreshToken cookie:', incomingRefreshToken ? 'Present' : 'Missing');


  if (!incomingRefreshToken) {
    return res.status(401).json({ error: 'Unauthorized: No refresh token' });
  }

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
    // Token is valid, issue a new access token
    // You could also check if this refresh token is in a DB blocklist if you implement that
    
    const userPayload = { id: decoded.id, email: decoded.email }; // Recreate payload from refresh token
    const newAccessToken = jwt.sign(userPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    });

    // Optional: Refresh Token Rotation (for enhanced security)
    // const newRefreshToken = jwt.sign(userPayload, process.env.JWT_REFRESH_SECRET, { expiresIn: decoded.exp - Math.floor(Date.now()/1000) > someThreshold ? decoded.exp - Math.floor(Date.now()/1000) + 's' : process.env.REFRESH_TOKEN_EXPIRES_IN });
    // setRefreshTokenCookie(res, newRefreshToken, true); // Assuming if they had a refresh token, they want to stay remembered

    console.log(`[POST /api/auth/refresh-token] New access token issued for user ID: ${decoded.id}`);
    res.json({ accessToken: newAccessToken });

  } catch (err) {
    console.error('Refresh token error:', err);
    // If refresh token is invalid or expired, clear it
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax', // Assuming same-origin setup
        path: '/api/auth',
    });
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Unauthorized: Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Forbidden: Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  // For JWT, logout primarily means the client discards the access token.
  // If you store refresh tokens server-side to allow invalidation, you'd do that here.
  // For now, we just clear the refresh token cookie.
  const refreshTokenFromCookie = req.cookies?.refreshToken;
  console.log('[POST /api/auth/logout] Attempting to logout. Refresh token in cookie:', refreshTokenFromCookie ? 'Present' : 'Missing');

  // (Advanced: If storing refresh tokens in DB: find and invalidate the token based on refreshTokenFromCookie or user ID)

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax', // Assuming same-origin setup
    path: '/api/auth', // Must match path used when setting
  });

  res.status(200).json({ message: 'Logout successful' });
};


// This route is for getting user info if they have a valid ACCESS token
const getCurrentUser = async (req, res) => {
    // verifyToken middleware should have run and put user data in req.user
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized: User data not found in token' });
    }
    try {
        // Fetch fresh user details from DB to ensure they are up-to-date
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
            [req.user.id]
        );
        if (userResult.rows.length > 0) {
            res.status(200).json({ user: userResult.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Error fetching current user:', err);
        res.status(500).json({ error: 'Failed to retrieve user data' });
    }
};


// The old getSession based on session_id cookie is no longer the primary way.
// We now use /refresh-token (for auto-login) and a protected /me route (for user data).
module.exports = { register, login, logout, refreshTokenController, getCurrentUser };