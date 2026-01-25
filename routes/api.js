const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT 1 as test');
    res.json({ 
      status: 'OK', 
      server: 'running',
      database: 'connected',
      test: result
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      server: 'running', 
      database: 'disconnected: ' + error.message
    });
  }
});

module.exports = router;