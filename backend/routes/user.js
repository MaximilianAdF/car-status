const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

router.get('/me', verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    first_name: req.user.first_name,
    email: req.user.email,
  });
});

module.exports = router;
