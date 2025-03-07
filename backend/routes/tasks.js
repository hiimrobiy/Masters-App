const express = require('express');
const db = require('../db');
const axios = require('axios');
const router = express.Router();
const GITHUB_API_URL = 'https://api.github.com';
require('dotenv').config();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
// Get all tasks

  router.get('/sprintTasks/:sprintId', async (req, res) => {
    const { sprintId } = req.params;
    try {
      await db.query("BEGIN");
      
      const result = await db.query(`SELECT * FROM tasks WHERE tasks.sprint_id = $1`, [sprintId]);
  
      const tasksWithIssues = await Promise.all(result.rows.map(async (task) => {
        const res_issues = await db.query(
          `SELECT * FROM task_issues as ti
           JOIN issues as i ON i.issue_id = ti.issue_id
           WHERE ti.task_id = $1`, [task.task_id]);
        task.issues = res_issues.rows;
        return task;
      }));
      
      await db.query("COMMIT");
      res.json(tasksWithIssues);
    } catch (error) {
      await db.query("ROLLBACK");
      res.status(500).json({ message: error.message });
    }
  });
  



/**
 * POST /api/issues
 * Create a new issue in a GitHub repository and save it to the database.
 */
router.post('/saveSprint/:project_id', async (req, res) => {
  const { repoId, title, description, assignees, labels, milestone, priority } = req.body;
  const { project_id } = req.params;
  try {
    // Fetch the repository details from your database
    
      const repoQuery = `
        SELECT 
          r.repo_id, 
          r.repo_name, 
          r.date_created, 
          u.name AS owner_name, 
          u.user_id AS owner_id
        FROM repositories r
        JOIN users u ON r.owner_id = u.user_id
        WHERE r.repo_id = $1
      `;
  
    const repoResult = await db.query(repoQuery, [repoId]);

    if (repoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { repo_name: repoName, owner_name } = repoResult.rows[0];
// Fetch GitHub usernames for assignees
    let assigneeUsernames = [];
    if (assignees && assignees.length > 0) {
      const assigneeQuery = `
        SELECT name
        FROM users
        WHERE user_id = ANY($1::bigint[])
      `;
      const assigneeResult = await db.query(assigneeQuery, [assignees]);
      assigneeUsernames = assigneeResult.rows.map(row => row.name);
    }
    let labelNames = [];
    if (labels && labels.length > 0) {
      const labelQuery = `
        SELECT label_name
        FROM labels
        WHERE label_id = ANY($1::int[])
      `;
      const labelResult = await db.query(labelQuery, [labels]);
      labelNames = labelResult.rows.map(row => row.label_name);
    }
    // Create the issue on GitHub
    const githubResponse = await axios.post(
      `${GITHUB_API_URL}/repos/${owner_name}/${repoName}/issues`,
      {
        title,
        body: description,
        assignees: assigneeUsernames || [], // Optional
        labels:labelNames, // Optional
        milestone: milestone || null, // Optional
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const githubIssue = githubResponse.data;

    // Save the issue to your database
    const saveIssueQuery = `
      INSERT INTO issues
        (issue_id, repo_id, title, description, created_at, updated_at, state, labels, milestone, url, priority)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (issue_id) DO NOTHING
    `;

    await db.query(saveIssueQuery, [
      githubIssue.id,
      repoId,
      githubIssue.title,
      githubIssue.body,
      githubIssue.created_at,
      githubIssue.updated_at,
      githubIssue.state,
      JSON.stringify(githubIssue.labels.map((label) => label.name)),
      githubIssue.milestone ? githubIssue.milestone.title : null,
      githubIssue.html_url,
      priority,
    ]);
    await db.query(`insert into project_issue (project_id,issue_id) 
      values (${project_id}, ${githubIssue.id})`)

    res.status(201).json({ message: 'Issue created successfully', issue: githubIssue });
  } catch (error) {
    console.error('Error creating issue:', error.message);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});




// Update a task's position or other details
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const {  position } = req.body;

  try {
    const result = await db.query(
      'UPDATE issues SET  position_x = COALESCE($1, position_x), position_y = COALESCE($2, position_y) WHERE issue_id = $3 RETURNING *',
      [ position?.x, position?.y,id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get('/repoIssues/:repositoryId/', async (req, res) => {
  const { repositoryId } = req.params;
  try {
    const result = await db.query('SELECT * FROM issues WHERE repo_id = $1', [repositoryId]);
    //console.log("result");
    const issues_response =[]
    for (const issue of result.rows) {
      const taskIssuesResult = await db.query(
        `SELECT t.*, ti.issue_id
         FROM tasks t
         JOIN task_issues ti ON t.task_id = ti.task_id
         WHERE ti.issue_id = $1`,
        [issue.issue_id]
      );
      issue.task = taskIssuesResult.rows[0];

      const issueAssignmentsResult = await db.query(
        `SELECT u.*
         FROM users u
         JOIN issue_assignments ia ON u.user_id = ia.user_id
         WHERE ia.issue_id = $1`,
        [issue.issue_id]
      );
      issue.assigned_users = issueAssignmentsResult.rows;
      issues_response.push(issue);
    }
    //console.log(result.rows)

    res.json(issues_response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a task's priority
router.patch('/priority/:id', async (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
 // console.log("task priority"+ priority);

  try {
    const result = await db.query(
      'UPDATE issues SET priority = $1 WHERE issue_id = $2 RETURNING *',
      [priority, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});


// POST /tasks/:task_id/assign-users
router.post('/:task_id/assign-users', async (req, res) => {
  const { task_id } = req.params;
  const { user_ids } = req.body;

  // Input validation
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'user_ids must be a non-empty array' });
  }

  try {
    // Begin transaction
    await db.query('BEGIN');

    // Optional: Check if the task exists
    const taskResult = await db.query('SELECT * FROM tasks WHERE task_id = $1', [task_id]);
    if (taskResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    // Optional: Check if users exist
    const usersResult = await db.query(
      'SELECT user_id FROM users WHERE user_id = ANY($1::int[])',
      [user_ids]
    );
    const existingUserIds = usersResult.rows.map((row) => row.user_id);
    const missingUserIds = user_ids.filter((id) => !existingUserIds.includes(id));

    if (missingUserIds.length > 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: `Users not found: ${missingUserIds.join(', ')}` });
    }

    // Assign users to the task
    const insertPromises = user_ids.map((user_id) => {
      return db.query(
        'INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [task_id, user_id]
      );
    });

    // Execute all insert queries
    await Promise.all(insertPromises);

    // Commit transaction
    await db.query('COMMIT');

    res.status(200).json({ message: 'Users assigned to task successfully' });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error assigning users to task:', error);
    res.status(500).json({ error: 'An error occurred while assigning users to the task' });
  }
});

// taskRoutes.js

router.put('/:issueId/status', async (req, res) => {
  const { issueId } = req.params;
  const { task_status } = req.body;

  try {
    const updateStatusQuery = `
      UPDATE tasks
      SET task_status = $1
      WHERE task_id = $2
      RETURNING *
    `;
    const result = await db.query(updateStatusQuery, [task_status, issueId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Issue status updated successfully', issue: result.rows[0] });
  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({ error: 'Failed to update issue status' });
  }
});

router.put('/update/:issueId/', async (req, res) => {
  const { issueId } = req.params;
  const { state, elapsed_time, finished_date, accessToken } = req.body;

  try {
    // Begin a transaction
    await db.query('BEGIN');

    // 1. Update the issue state in the issues table
    const updateResult = await db.query(
      `UPDATE issues SET state = $1 WHERE issue_id = $2 RETURNING *`,
      [state, issueId]
    );

    // 2. Update task_issues depending on the issue state
    if (state === 'closed' && elapsed_time && finished_date) {
      await db.query(
        `UPDATE task_issues SET elapsed_time = $1, finished_date = $3 WHERE issue_id = $2`,
        [elapsed_time, issueId, finished_date]
      );
    } else if (state === 'open') {
      await db.query(
        `UPDATE task_issues SET elapsed_time = $1, finished_date = $3 WHERE issue_id = $2`,
        [0, issueId, null]
      );
    }

    // 3. Update dependent issues (if applicable)
    await db.query(
      `UPDATE issue_dependencies SET dependency_status = $2 WHERE depends_on_issue_id = $1`,
      [issueId, state]
    );

    // 4. Update GitHub issue status if repository info is available
    const repoResult = await db.query(
      `SELECT *
       FROM issues 
       JOIN repositories ON issues.repo_id = repositories.repo_id
       JOIN users ON users.user_id = repositories.owner_id
       WHERE issues.issue_id = $1`,
      [issueId]
    );
    const repoName = repoResult.rows[0]?.repo_name;
    const repoOwner = repoResult.rows[0]?.name;
    const github_issue_number = repoResult.rows[0]?.issue_number;
    if (repoName && repoOwner && issueId) {
      const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${github_issue_number}`;
      const githubUpdateData = {
        state: state === 'closed' ? 'closed' : 'open'
      };
      const headers = {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      };

      await axios.patch(githubApiUrl, githubUpdateData, { headers });
      console.log(`GitHub issue ${github_issue_number} updated successfully`);
    }

    // 5. When closing an issue, free dates for assigned users only if they have no other open issues in this task
    if (state === 'closed' && finished_date) {
      // Retrieve the original start_date and task_id from task_issues
      const datesResult = await db.query(
        'SELECT start_date, task_id FROM task_issues WHERE issue_id = $1',
        [issueId]
      );
      const start_date = datesResult.rows[0]?.start_date;
      const task_id = datesResult.rows[0]?.task_id;

      // Retrieve all user IDs assigned to this issue
      const userResult = await db.query(
        'SELECT user_id FROM issue_assignments WHERE issue_id = $1',
        [issueId]
      );
      const userIds = userResult.rows.map(row => row.user_id);

      for (const user_id of userIds) {
        // Check if the user has any other open issues in the same task
        const otherIssuesResult = await db.query(
          `
          SELECT COUNT(*) AS count
          FROM issue_assignments ia
          JOIN task_issues ti ON ia.issue_id = ti.issue_id
          JOIN issues i ON i.issue_id = ia.issue_id
          WHERE ti.task_id = $1
            AND ia.user_id = $2
            AND ia.issue_id <> $3
            AND i.state != 'closed'
          `,
          [task_id, user_id, issueId]
        );
        const count = parseInt(otherIssuesResult.rows[0].count, 10);

        // Free the dates only if there are no other open issues for this user in the same task
        if (count === 0) {
          await db.query(
            `
            WITH freed_dates AS (
              SELECT generate_series($1::date, $2::date, '1 day') AS d
            )
            UPDATE user_availability
            SET is_free = true
            WHERE user_id = $3
              AND date IN (SELECT d FROM freed_dates)
            `,
            [start_date, finished_date, user_id]
          );
        }
      }
    }

    // Commit the transaction
    await db.query('COMMIT');
    res.json({ message: 'Issue updated successfully, and GitHub issue status synchronized.' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

router.get(`/taskIssues/`, async (req, res) => {
  try{
      const result = await db.query(`select * from task_issues `);
      res.json(result.rows);
  }
  catch(error){
    console.error('Error fetching task issues:', error);
    res.status(500).json({ error: 'Failed to fetch task issues' });
  }

});
router.get('/:project_id', async (req, res) => {
  const{project_id} = req.params
  try {
    const result = await db.query(`SELECT * FROM issues
      JOIN project_issues as pi
      ON issues.issue_id = pi.issue_id
      WHERE pi.project_id = ${project_id}`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.delete('/taskDelete/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    await db.query('BEGIN');

    // ✅ Check if any issues are still assigned to this task
    const issueCheck = await db.query(
      `SELECT COUNT(*) FROM task_issues WHERE task_id = $1`,
      [taskId]
    );

    const issueCount = parseInt(issueCheck.rows[0].count, 10);

    if (issueCount > 0) {
      await db.query('COMMIT');
      return res.status(400).json({ message: 'Task cannot be deleted because it still has assigned issues.' });
    }

    // ✅ Delete task if no issues remain
    const deleteTask = await db.query(
      `DELETE FROM tasks WHERE task_id = $1 RETURNING *`,
      [taskId]
    );

   

    await db.query('COMMIT');
    res.json({ message: 'Task deleted successfully', deletedTask: deleteTask.rows[0] });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error deleting task:', error.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;

