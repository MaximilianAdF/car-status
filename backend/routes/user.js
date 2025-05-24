const express = require('express');
const router = express.Router();
const verifySession = require('../middleware/verifySession');

router.get('/me', verifySession, (req, res) => {
  res.json({
    id: req.user.id,
    first_name: req.user.first_name,
    email: req.user.email,
  });
});

module.exports = router;
