const express = require('express');
const db = require('../db');
const axios = require('axios');
const router = express.Router();
// Get all tasks
router.get('/info/:userId', async (req, res) => {0
    const{userId} = req.params;
    
  try {
    const result = await db.query(
        `SELECT * FROM issue_assignments ia
         JOIN issues i ON i.issue_id = ia.issue_id
         JOIN tasks t ON t.task_id = ia.task_id
         JOIN repositories r ON t.repo_id = r.repo_id
         JOIN users u ON u.user_id = ia.user_id
         JOin task_issues ti on ti.task_id = t.task_id and ti.issue_id = i.issue_id
         JOIN sprints s ON t.sprint_id =  s.sprint_id
        WHERE ia.user_id =$1
        ORDER by ti.end_date desc`, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


