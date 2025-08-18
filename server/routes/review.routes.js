const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Placeholder for review routes
router.get('/', (req, res) => {
  res.json({ message: 'Review routes coming soon' });
});

module.exports = router;





