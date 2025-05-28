// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // Expects "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1]; // Extract token part

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Unauthorized: Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
    // Token is valid, attach decoded payload (which should contain user info like id) to request
    req.user = decoded; // e.g., if your JWT payload is { id: userId, email: userEmail }
    next();
  });
};

module.exports = verifyToken;