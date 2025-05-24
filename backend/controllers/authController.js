const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db'); //db pool

const register = async (req, res) => {
  const { first_name, last_name, pass } = req.body;
  const email = req.body.email ? req.body.email.toLowerCase() : null;

  if (!email || !pass) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hashedPass = await bcrypt.hash(pass, 10);
    const session_id = uuidv4();

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, pass, session_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
      [first_name, last_name, email, hashedPass, session_id]
    );

    // Set the session_id cookie here:
    res.cookie('session_id', session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set to true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/', // Ensure the cookie is available for all routes
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(201).json({ message: 'User created', user: { id: result.rows[0].id, email: result.rows[0].email, first_name, last_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { pass, long_token } = req.body;
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

    // Create new session ID (invalidate old)
    const newSessionId = uuidv4();
    await pool.query('UPDATE users SET session_id = $1 WHERE id = $2', [newSessionId, user.id]);

    // Set session_id cookie here:
    console.log(`[${req.method} ${req.path}] Setting session_id cookie:`, newSessionId);
    res.cookie('session_id', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set to true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/', // Ensure the cookie is available for all routes
      maxAge: long_token ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000, // 30 days or 12 hours
    });

    res.json({ message: 'Login successful', user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};


const logout = async (req, res) => {
    const { session_id } = req.cookies;

    if (!session_id) {
      return res.status(400).json({ error: 'No session found' });
    }

    try {
      const queryResult = await pool.query('UPDATE users SET session_id = NULL WHERE session_id = $1', [session_id]);
  
      // Clear the cookie
      res.clearCookie('session_id', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set to true in production
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      });
  
      if (queryResult.rowCount > 0) {
        res.json({ message: 'Logout successful' });
      } else {
        // Session ID not found or already null, still clear cookie
        res.json({ message: 'Session not found or already logged out' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Logout failed' });
    }
};

const getSession = async (req, res) => {
  console.log('[GET /api/auth/session] Request Cookies:', req.cookies); // For debugging
  const { session_id } = req.cookies || {}; // Default to empty object if req.cookies is undefined

  if (!session_id) {
    // No session cookie, so no authenticated user. This is a valid state, not an error.
    return res.status(200).json({ user: null }); 
  }

  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE session_id = $1',
      [session_id]
    );
    const user = result.rows[0];

    if (!user) {
      // Cookie exists but session_id is not valid (e.g., after logout, or if DB entry was cleared )
      // It's good practice to clear a potentially invalid/stale cookie from the browser
      res.clearCookie('session_id', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        path: '/',
      });
      return res.status(200).json({ user: null }); // Valid state, user is not authenticated
    }

    // Valid session, return user data (excluding sensitive info like password hash)
    res.status(200).json({ user });
  } catch (err) {
    console.error('Get session error:', err);
    // Send a 200 with user: null in case of server error during session check,
    // rather than a 500, to prevent frontend from breaking if backend has db issues.
    // The frontend will treat user: null as "not logged in".
    // Alternatively, you could send a 500 if you want to signal a server problem more explicitly.
    res.status(200).json({ user: null, error: 'Failed to retrieve session due to server error' });
  }
};

module.exports = { register, login, logout, getSession };
