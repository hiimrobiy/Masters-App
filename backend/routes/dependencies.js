// routes/dependencies.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /dependencies
router.post('/', async (req, res) => {
  const { issueId, dependsOnIssueId, repositoryId } = req.body;

  if (!issueId || !dependsOnIssueId || !repositoryId) {
    return res.status(400).json({ error: 'sourceTaskId, targetTaskId, and repositoryId are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO issue_dependencies (repo_id, issue_id, depends_on_issue_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [repositoryId, issueId, dependsOnIssueId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding dependency:', error);
    res.status(500).json({ error: 'Failed to add dependency' });
  }
});
// routes/dependencies.js

// GET /dependencies/:repositoryId
router.get('/:repositoryId', async (req, res) => {
    const { repositoryId } = req.params;
  
    try {
      const result = await db.query(
        `SELECT * FROM issue_dependencies WHERE repo_id = $1`,
        [repositoryId]
      );
  
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      res.status(500).json({ error: 'Failed to fetch dependencies' });
    }
  });

module.exports = router;
