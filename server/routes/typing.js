const express = require('express');
const router = express.Router();

router.get('/typing', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Typing route working'
  });
});

module.exports = router;