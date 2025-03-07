const express = require('express');
const db = require('../db');
const axios = require('axios');
const router = express.Router();
// Get all tasks
router.get('/:userId', async (req, res) => {0
    const{userId} = req.params;
    
  try {
    const result = await db.query(`
      SELECT * FROM notifications 
      JOIN repositories on notifications.repo_id = repositories.repo_id
      JOIN sprints on notifications.sprint_id = sprints.sprint_id
      JOIN tasks on tasks.task_id = notifications.task_id
      JOIN issues on notifications.issue_id = issues.issue_id
      WHERE user_id =$1 ORDER BY notifications.created_at DESC`, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post('/read/:notifId', async (req, res) => {
  const {notifId} = req.params;
  try {
    const result = await db.query('UPDATE notifications SET is_read = true WHERE notif_id = $1', [notifId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})
module.exports = router;


