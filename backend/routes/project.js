const express = require('express');
const db = require('../db'); // Import your database connection
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Use environment variable for security
const GITHUB_API_URL = 'https://api.github.com';
const { getUserRepositories } = require( '../githubApi');

const router = express.Router();
const axios = require('axios');


router.get('/getProject/', async (req, res) => {
    try {
        const projects = await db.query('SELECT project_id as id ,project_name FROM project');
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }

});
router.post("/addProject/", async (req, res) => {
    const { project_name} = req.body;
    try {
        const result = await db.query('INSERT INTO project (project_name ) VALUES ($1) RETURNING *', [project_name, ]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
})
module.exports = router; 