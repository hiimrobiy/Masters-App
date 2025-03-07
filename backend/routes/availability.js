
const express = require('express');
const db = require('../db');
const axios = require('axios');
const router = express.Router();
// Get all tasks
router.get('/', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  
    try {
      const result = await db.query(
        `SELECT 
           to_char(date, 'YYYY-MM-DD') as date,
           is_free
         FROM user_availability
         WHERE user_id = $1
         ORDER BY date ASC`,
        [user_id]
      );
      res.json(result.rows); // Each row: { date: 'YYYY-MM-DD', is_free: true/false }
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  router.post('/', async (req, res) => {
    const { user_id,is_free,date } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  
    try {
      const result = await db.query(
        `UPDATE user_availability SET is_free =$1 
        WHERE user_id =$2
        AND date = $3`,[is_free,user_id,date]
      );
      res.json(result.rows); // Each row: { date: 'YYYY-MM-DD', is_free: true/false }
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  module.exports = router;