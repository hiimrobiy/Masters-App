const express = require('express');
const db = require('../db'); // Import your database connection
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Use environment variable for security
const GITHUB_API_URL = 'https://api.github.com';
const { getUserRepositories } = require( '../githubApi');

const router = express.Router();
const axios = require('axios');
// Create a new repository
router.post('/:project_id', async (req, res) => {
  const { project_id } = req.params;
  const { name } = req.body;
  try {
    await db.query("BEGIN")
    const result = await db.query(
      'INSERT INTO repositories (name) VALUES ($1) RETURNING *',
      [name]
    );
    if(result.rowCount>0){
      const repo_id = result.rows[0].repo_id;
      const result2 = await db.query(
        `Insert into project_repo (repo_id,project_id) VALUES ($1,$2) `,[repo_id,project_id]
      )
  }
  await db.query("COMMIT")
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await db.query("ROLLBACK")
    res.status(400).json({ message: error.message });
  }
});

// Get all repositories
router.get('/repos/user/:username/:token/:project_id', async (req, res) => {
  const { username,token,project_id } = req.params;
  try {
   // console.log("Here");
    const result = await getUserRepositories(username,token);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/labels/', async (req, res) => {
  try {
   // console.log("Here");
    const result = await db.query(`SELECT * FROM labels`);  
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post('/labels/', async (req, res) => {

  const { name} = req.body;
  try {
    const result = await db.query(
      'INSERT INTO labels (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }

});

// Get issues for a specific repository
router.get('/repoIssues/:repositoryId/issues', async (req, res) => {
  const { repositoryId } = req.params;
  try {
    const result = await db.query('SELECT * FROM issues WHERE repo_id = $1', [repositoryId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/:project_id/:userId', async (req, res) => {
  const { project_id ,userId} = req.params;
  
  // Ensure you have the current user's id. (Adjust accordingly if using query parameters.)

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  
  try {
    const queryText = `
      SELECT 
        r.*,
        CASE WHEN ru.user_id IS NOT NULL THEN true ELSE false END AS is_collaborator
      FROM repositories r
      JOIN project_repo pr ON pr.repo_id = r.repo_id
      LEFT JOIN repo_user ru ON ru.repo_id = r.repo_id AND ru.user_id = $1
      WHERE pr.project_id = $2
    `;
    const values = [userId, project_id];
    
    const result = await db.query(queryText, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
