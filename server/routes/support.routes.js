const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Placeholder for support routes
router.get('/', (req, res) => {
  res.json({ message: 'Support routes coming soon' });
});

module.exports = router;





