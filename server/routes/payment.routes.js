const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Placeholder for payment routes
router.get('/', (req, res) => {
  res.json({ message: 'Payment routes coming soon' });
});

module.exports = router;








