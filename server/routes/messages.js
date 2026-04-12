const express = require('express');
const router = express.Router();

// Store messages in memory for now (we'll add MongoDB later)
let messages = [];

router.get('/messages', (req, res) => {
  res.status(200).json({
    success: true,
    messages: messages
  });
});

module.exports = { router, messages };