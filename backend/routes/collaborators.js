// GET /collaborator/:repoId

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:repoId', async (req, res) => {
  const { repoId } = req.params;

  try {
    // Query to fetch collaborators and their workload, projects, and issue counts
    const collaboratorsQuery = `
      SELECT 
        u.user_id,
        u.name,
        u.profile_picture,
        u.total_workload,
        CASE
          WHEN u.total_workload < 20 THEN 'available'
          WHEN u.total_workload BETWEEN 20 AND 35 THEN 'moderate'
          ELSE 'occupied'
        END AS status
      FROM repo_user ru
      JOin users u on ru.user_id = u.user_id
      WHERE ru.repo_id = $1
      GROUP BY u.user_id, u.name, u.profile_picture, u.total_workload;
    `;
    const collaborators = await db.query(collaboratorsQuery, [repoId]);

    res.status(200).json(collaborators.rows);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

module.exports = router;
