const express = require('express');
const db = require('../db'); // Import your database connection
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Use environment variable for security
const GITHUB_API_URL = 'https://api.github.com';
const { getUserRepositories } = require( '../githubApi');

const router = express.Router();
const axios = require('axios');


router.post(`/addIssue/:project_id`, async (req, res)=>{
    const {projectId} = req.params;
    const { title, description, labels = [], assignees = [] ,repoId,priority,token} = req.body;
    const repoNameResult = await db.query(`select repo_name,users.name as user_name from repositories join  users on user_id=owner_id where repo_id =$1`,[repoId])
    const repoName = repoNameResult.rows[0].repo_name;
    const ownerName = repoNameResult.rows[0].user_name;
    const placeholderLabels = labels.map((_, index) => `$${index + 1}`).join(', ');
  const queryLabel = `
    SELECT label_name
    FROM labels
    WHERE label_id IN (${placeholderLabels})
  `;
  const placeholderUser = assignees.map((_, index) => `$${index + 1}`).join(', ');
  const queryUser = `
    SELECT name
    FROM users
    WHERE user_id IN (${placeholderUser})
  `;

    const labelsStringsResult= await db.query(queryLabel,labels);
    const labelsAsStrings = labelsStringsResult.rows.map((label)=>label.label_name);
    const usernamesResult= await db.query(queryUser,assignees);
    const userNameAsStrings = usernamesResult.rows.map((user)=>user.name);
    const githubResponse = await createIssue(ownerName, repoName, title, description,labelsAsStrings,userNameAsStrings,token);
    const insertIssueResult = await db.query(`INSERT INTO issues (issue_id,repo_id, title, description, priority, url,labels,issue_number) VALUES ($1, $2, $3, $4, $5, $6,$7,$8) RETURNING *`,
       [githubResponse.id,repoId, title, description, priority, githubResponse.html_url,JSON.stringify(labelsAsStrings),githubResponse.number]);
    
    res.status(200).send(insertIssueResult.rows[0]);
});
async function createIssue(owner, repoName, issueTitle, issueBody, labels = [], assignees = [],token) {
    try {
      const response = await axios.post(
        `${GITHUB_API_URL}/repos/${owner}/${repoName}/issues`,
        {
          title: issueTitle,
          body: issueBody,
          labels: labels,
          assignees: assignees,
        },
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
  
      // console.log('Issue created successfully:', response.data);
      return response.data; // Return issue details
    } catch (error) {
      console.error('Error creating issue:', error.response?.data || error.message);
      throw error;
    }
  }
module.exports = router; 