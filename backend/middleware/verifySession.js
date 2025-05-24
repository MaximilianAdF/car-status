// verifySession.js
const pool = require('../db');

const verifySession = async (req, res, next) => {
  const session_id = req.cookies?.session_id;
  const userIdFromHeader = req.headers['user_id'];

  if (!userIdFromHeader || !session_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing credentials' });
  }

  try {
    const parsedUserId = parseInt(userIdFromHeader, 10);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid user_id format in header' });
    }

    const result = await pool.query('SELECT session_id FROM users WHERE id = $1', [parsedUserId]);
    
    if (result.rows.length === 0) {
      // User ID from header not found in DB
      return res.status(403).json({ error: 'Forbidden: User not found' });
    }
    const currentSession = result.rows[0]?.session_id;

    if (currentSession !== session_id) {
      return res.status(403).json({ error: 'Session invalid or expired' });
    }

    // Attach parsedUserId to the request object for downstream handlers
    req.userId = parsedUserId; // <<< KEY MODIFICATION

    next();
  } catch (err) {
    console.error('Session verification failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = verifySession;