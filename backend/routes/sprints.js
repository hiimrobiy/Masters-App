// routes/sprints.js
const  { sendNotification } = require('../notificationService');
const express = require('express');
const db = require('../db');

const router = express.Router();
// GET /sprints - Get all sprints
// routes/sprints.js



// GET /sprints - Get all sprints with tasks and assigned users// sprintRoutes.js

// GET /sprints - Get all sprints with tasks, issues, and assignments
router.get('/getAllSprints/:project_id', async (req, res) => {
  const { project_id } = req.params;
  try {
    const sprintsQuery = `
      SELECT
        s.sprint_id,
        s.sprint_name,
        s.start_date AS sprint_start_date,
        s.end_date AS sprint_end_date,
        s.owner_id as sprint_owner_id,
        t.task_id,
        t.task_title,
        t.task_sequence,
        t.repo_id,
        t.task_status,
        r.repo_name,
        ti.issue_id,
        ti.expected_time,
        ti.elapsed_time,
        ti.issue_sequence,
        ti.start_date,
        ti.finished_date,
        ti.end_date,
        i.title AS issue_title,
        i.status AS status,
        i.state AS state,
        ia.user_id,
        u.name AS user_name,
        u.profile_picture AS user_profile_picture,
        COALESCE(deps.dependencies, '[]'::json) AS dependencies
      FROM sprints s
        LEFT JOIN tasks t ON t.sprint_id = s.sprint_id
        LEFT JOIN repositories r ON t.repo_id = r.repo_id
        LEFT JOIN task_issues ti ON ti.task_id = t.task_id
        LEFT JOIN issues i ON i.issue_id = ti.issue_id
        LEFT JOIN issue_assignments ia 
          ON ia.task_id = t.task_id
          AND ia.issue_id = ti.issue_id
        LEFT JOIN users u ON u.user_id = ia.user_id
        JOIN project_sprint ps ON ps.sprint_id = s.sprint_id

        /* LATERAL subquery to get dependencies array */
        LEFT JOIN LATERAL (
          SELECT json_agg(d.depends_on_issue_id) AS dependencies
          FROM issue_dependencies d
          WHERE d.issue_id = i.issue_id
        ) deps ON TRUE

      WHERE ps.project_id = $1
      ORDER BY s.sprint_id, t.task_sequence, ti.issue_sequence
    `;

    const result = await db.query(sprintsQuery, [project_id]);

    // Transform into nested structure
    const sprintsMap = new Map();

    result.rows.forEach((row) => {
      const sprintId = row.sprint_id;
      if (!sprintsMap.has(sprintId)) {
        sprintsMap.set(sprintId, {
          sprint_id: sprintId,
          sprint_owner_id: row.sprint_owner_id,
          sprint_name: row.sprint_name,
          start_date: row.sprint_start_date,
          end_date: row.sprint_end_date,
          tasks: [],
        });
      }
      const sprint = sprintsMap.get(sprintId);

      if (row.task_id) {
        let task = sprint.tasks.find((t) => t.task_id === row.task_id);
        if (!task) {
          task = {
            task_id: row.task_id,
            task_title: row.task_title,
            task_sequence: row.task_sequence,
            repo_id: row.repo_id,
            repo_name: row.repo_name,
            task_status: row.task_status,
            issues: [],
          };
          sprint.tasks.push(task);
        }

        if (row.issue_id) {
          let issue = task.issues.find((i) => i.issue_id === row.issue_id);
          if (!issue) {
            issue = {
              issue_id: row.issue_id,
              issue_title: row.issue_title,
              expected_time: row.expected_time,
              elapsed_time: row.elapsed_time,
              issue_sequence: row.issue_sequence,
              assigned_users: [],
              status: row.status,
              start_date: row.start_date,
              end_date: row.end_date,
              finished_date: row.finished_date,
              state: row.state,

              // <--- Add the 'dependencies' from the row
              dependencies: row.dependencies || [],
            };
            task.issues.push(issue);
          }

          // If there's a user assigned
          if (row.user_id) {
            const alreadyAssigned = issue.assigned_users.some(
              (u) => u.user_id === row.user_id
            );
            if (!alreadyAssigned) {
              issue.assigned_users.push({
                user_id: row.user_id,
                name: row.user_name,
                profile_picture: row.user_profile_picture,
              });
            }
          }
        }
      }
    });

    const sprints = Array.from(sprintsMap.values());
    res.status(200).json(sprints);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});



// GET /sprints/:sprintId - Get a sprint by ID
// GET /sprints/:sprintId - Get a sprint by ID with tasks, issues, and assignments
router.get('/getSprint/:sprint_id', async (req, res) => {
  const { sprint_id } = req.params; // Extract sprint_id from URL parameters

  try {
    const sprintsQuery = `
      SELECT
        s.sprint_id,
        s.sprint_name,
        s.start_date AS sprint_start_date,
        s.end_date AS sprint_end_date,
        s.owner_id as sprint_owner_id,
        t.task_id,
        t.task_title,
        t.task_sequence,
        t.repo_id,
        t.task_status,
        r.repo_name,
        ti.issue_id,
        ti.expected_time,
        ti.elapsed_time,
        ti.issue_sequence,
        ti.start_date,
        ti.finished_date,
        ti.end_date,
        i.title AS issue_title,
        i.status AS status,
        i.state AS state,
        ia.user_id,
        u.name AS user_name,
        u.profile_picture AS user_profile_picture,
        COALESCE(deps.dependencies, '[]'::json) AS dependencies
      FROM sprints s
        LEFT JOIN tasks t ON t.sprint_id = s.sprint_id
        LEFT JOIN repositories r ON t.repo_id = r.repo_id
        LEFT JOIN task_issues ti ON ti.task_id = t.task_id
        LEFT JOIN issues i ON i.issue_id = ti.issue_id
        LEFT JOIN issue_assignments ia 
          ON ia.task_id = t.task_id
          AND ia.issue_id = ti.issue_id
        LEFT JOIN users u ON u.user_id = ia.user_id

        /* LATERAL subquery to get dependencies array */
        LEFT JOIN LATERAL (
          SELECT json_agg(d.depends_on_issue_id) AS dependencies
          FROM issue_dependencies d
          WHERE d.issue_id = i.issue_id
        ) deps ON TRUE

      WHERE s.sprint_id = $1
      ORDER BY t.task_sequence, ti.issue_sequence
    `;

    // Execute the query with sprint_id as the parameter
    const result = await db.query(sprintsQuery, [sprint_id]);

    // Transform into nested structure
    const sprintsMap = new Map();

    result.rows.forEach((row) => {
      const sprintId = row.sprint_id;
      if (!sprintsMap.has(sprintId)) {
        sprintsMap.set(sprintId, {
          sprint_id: sprintId,
          sprint_name: row.sprint_name,
          start_date: row.sprint_start_date,
          end_date: row.sprint_end_date,
          sprint_owner_id: row.sprint_owner_id,
          tasks: [],
        });
      }
      const sprint = sprintsMap.get(sprintId);

      if (row.task_id) {
        let task = sprint.tasks.find((t) => t.task_id === row.task_id);
        if (!task) {
          task = {
            task_id: row.task_id,
            task_title: row.task_title,
            task_sequence: row.task_sequence,
            repo_id: row.repo_id,
            repo_name: row.repo_name,
            task_status: row.task_status,
            issues: [],
          };
          sprint.tasks.push(task);
        }

        if (row.issue_id) {
          let issue = task.issues.find((i) => i.issue_id === row.issue_id);
          if (!issue) {
            issue = {
              issue_id: row.issue_id,
              issue_title: row.issue_title,
              expected_time: row.expected_time,
              elapsed_time: row.elapsed_time,
              issue_sequence: row.issue_sequence,
              assigned_users: [],
              status: row.status,
              start_date: row.start_date,
              end_date: row.end_date,
              finished_date: row.finished_date,
              state: row.state,
              dependencies: row.dependencies || [],
            };
            task.issues.push(issue);
          }

          // If there's a user assigned
          if (row.user_id) {
            const alreadyAssigned = issue.assigned_users.some(
              (u) => u.user_id === row.user_id
            );
            if (!alreadyAssigned) {
              issue.assigned_users.push({
                user_id: row.user_id,
                name: row.user_name,
                profile_picture: row.user_profile_picture,
              });
            }
          }
        }
      }
    });

    // Convert the map to an array and return the first (and only) sprint
    const sprints = Array.from(sprintsMap.values());
    if (sprints.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.status(200).json(sprints[0]); // Return the first sprint
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ error: 'Failed to fetch sprint' });
  }
});

// POST /sprints - Create a new sprint with tasks and assignments
// sprintRoutes.js

// sprintRoutes.js

router.post('/saveSprint/:project_id', async (req, res) => {
  const { project_id } = req.params;
  const {
    owner_id,
    sprint_name,
    start_date,
    end_date,
    tasks, // array of tasks with task_name, repo_id, sequence, issues
  } = req.body;
  try {
    // Begin transaction
    await db.query('BEGIN');
    const notificationsToSend = [];
    // Insert the sprint (without repo_id)
    const sprintResult = await db.query(
      `INSERT INTO sprints (sprint_name, start_date, end_date,owner_id)
       VALUES ($1, $2, $3,$4)
       RETURNING sprint_id`,
      [sprint_name, start_date, end_date,owner_id]
    );
    const sprint_id = sprintResult.rows[0].sprint_id;
    const project_sprint = await db.query(`INSERT INTO project_sprint (project_id,sprint_id) VALUES ($1,$2)`,[project_id,sprint_id]);
    // Insert tasks and related data
    for (const task of tasks) {
      const { task_name, repo_id, sequence: task_sequence, issues } = task;

      // Insert the task with repo_id
      const taskResult = await db.query(
        `INSERT INTO tasks (sprint_id, task_title, repo_id, task_sequence)
         VALUES ($1, $2, $3, $4)
         RETURNING task_id`,
        [sprint_id, task_name, repo_id, task_sequence]
      );
      const task_id = taskResult.rows[0].task_id;

      // Insert issues and assignments
      for (const issue of issues) {
        const { issue_id, user_ids, expected_time, sequence: issue_sequence } = issue;

        // Insert the issue into task_issues junction table
        await db.query(
          `INSERT INTO task_issues (task_id, issue_id, issue_sequence)
           VALUES ($1, $2, $3)`,
          [task_id, issue_id, issue_sequence]
        );
        const issue_name_response = await db.query(`SELECT title FROM issues WHERE issue_id = $1`,[issue_id]);
        const issue_name = issue_name_response.rows[0].title;
        // Assign users to the issue
        for (const user_id of user_ids) {
          await db.query(
            `INSERT INTO issue_assignments (task_id, issue_id, user_id,owner_id)
             VALUES ($1, $2, $3,$4)`,
            [task_id, issue_id, user_id,owner_id]
          );
          await db.query(`
            INSERT INTO notifications (user_id,repo_id,task_id,issue_id,sprint_id,type,message  )
            VALUES ($1, $2, $3,$4,$5,$6,$7)
          `, [
            user_id,
            repo_id,
            task_id,
            issue_id,
            sprint_id,
            'TIMESTAMP',
            `You have been assigned to "${issue_name}" in the task "${task_name}" of sprint "${sprint_name}". Please estimate how long it will take.`,
          ]);
          notificationsToSend.push({
            user_id,
            repo_id,
            task_id,
            issue_id,
            sprint_id,
            message: `You have been assigned to "${issue_name}" in the task "${task_name}" of sprint "${sprint_name}". Please estimate how long it will take.`,
          });
        }
      }
    }

    // Commit transaction
    await db.query('COMMIT');
    for (const notif of notificationsToSend) {
      // sendNotification could be from a global utility imported here
       sendNotification(notif.user_id,  notif.message );
    }

    res.status(201).json({ message: 'Sprint created successfully', sprint_id });
  } catch (error) {
    // Rollback transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error creating sprint:', error);
    res.status(500).json({ error: 'Failed to create sprint' });
  }
  
});


router.get('/players/:taskId/:issueId',async (req, res) => {
  const { issueId,taskId } = req.params;
  try {
  const result = await db.query(
    `select * from 
    issue_assignments as ia 
    join users as u 
    on ia.user_id = u.user_id
    where ia.issue_id =$1 and ia.task_id =$2`,
    [issueId,taskId]
  );
  res.status(200).json(result.rows);
} catch (error) {
  console.error('Error fetching players for issue:', error);
  res.status(500).json({ error: 'Failed to fetch players' });
}


  
})
router.post('/updateSprintDates/:sprint_id', async (req, res) => {
  const { new_start_date, new_end_date } = req.body;
  const { sprint_id } = req.params;

  try {
    await db.query('BEGIN'); // Start a transaction

    // Update the sprint's start and end dates
    const result = await db.query(
      `UPDATE sprints 
       SET start_date = $1, end_date = $2 
       WHERE sprint_id = $3 
       RETURNING *`,
      [new_start_date, new_end_date, sprint_id]
    );

    if (result.rowCount === 0) {
      throw new Error('Sprint not found');
    }

    await db.query('COMMIT'); // Commit transaction

    res.status(200).json({ message: 'Sprint dates updated successfully', sprint: result.rows[0] });
  } catch (error) {
    await db.query('ROLLBACK'); // Rollback on error
    console.error('Error updating sprint dates:', error);
    res.status(500).json({ error: 'Failed to update sprint dates' });
  }
});

router.post('/players/:user_id/:task_id/:issue_id',async(req, res) => {
  const { user_id,task_id,issue_id } = req.params;
  const { inputValue,repo_id,sprint_id } = req.body;
  try {
    await db.query('BEGIN');
    const result = await db.query(
     `update issue_assignments
     set time = $1
     where user_id = $2 and task_id = $3 and issue_id = $4`,
     [inputValue, user_id,task_id,issue_id] 
    );
    const allSubmittedResult = await db.query(
      `SELECT COUNT(*) AS pending_users
       FROM issue_assignments
       WHERE task_id = $1 AND
       issue_id = $2 AND time <= 0`,
      [task_id,issue_id]
    );
    
    const pendingUsers = parseInt(allSubmittedResult.rows[0].pending_users, 10);
    const taskNameResult = await db.query(`
      SELECT task_title FROM tasks WHERE task_id = $1`,
      [task_id])
    const task_title = taskNameResult.rows[0].task_title;

    const issueTitleResult = await db.query(
      `SELECT title FROM issues WHERE issue_id = $1`,
      [issue_id])
    const issue_title = issueTitleResult.rows[0].title;
    const owner_id = await db.query(`
      SELECT owner_id from sprints
      where sprint_id = $1
    `,[sprint_id]);
    const sprint_owner_id = parseInt(owner_id.rows[0].owner_id, 10);

    if (pendingUsers === 0) {
      await db.query(`
        INSERT INTO notifications (user_id,repo_id,task_id,issue_id,sprint_id,type,message  )
        VALUES ($1, $2, $3,$4,$5,$6,$7)
      `, [
        sprint_owner_id,
        repo_id,
        task_id,
        issue_id,
        sprint_id,
        'TIMESTAMP-COMPLETED',
        `All users have submitted a value for this issue ${issue_title} in  task ${task_title}`,
      ]);
     
     // All users have submitted a value, send notification to the  owner_id = result.rows[0].owner_id;
      sendNotification(sprint_owner_id,  `All users have submitted a value for this issue ${issue_title} in  task ${task_title}`);
    }

    await db.query('COMMIT');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching players for issue:', error);
    
}
}
);
router.post('/playersConfirm', async (req, res) => {
  const { task_id, issue_id, sprint_id, repo_id } = req.body;
  
  try {
    await db.query('BEGIN');
    
    // 1. Update expected_time in task_issues using the average of the "time" values from issue_assignments.
    const updateTaskIssuesQuery = `
      UPDATE task_issues
      SET expected_time = (
        SELECT COALESCE(AVG(time), 0)
        FROM issue_assignments
        WHERE task_id = $1 AND issue_id = $2
      )
      WHERE task_id = $1 AND issue_id = $2;
    `;
    await db.query(updateTaskIssuesQuery, [task_id, issue_id]);
    
    // 2. Update notifications to set locked = true for the corresponding task and issue.
    const updateNotificationsQuery = `
      UPDATE notifications 
      SET locked = true 
      WHERE task_id = $1 AND issue_id = $2;
    `;
    await db.query(updateNotificationsQuery, [task_id, issue_id]);
    
    // 3. Check if all players have submitted their values (i.e. time > 0).
    const allSubmittedResult = await db.query(
      `SELECT COUNT(*) AS pending_users
       FROM issue_assignments
       WHERE task_id = $1 AND issue_id = $2 AND time <= 0`,
      [task_id, issue_id]
    );
    const pendingUsers = parseInt(allSubmittedResult.rows[0].pending_users, 10);

    // 4. If all players have submitted, retrieve details and push notification.
    if (pendingUsers === 0) {
      // Retrieve task title for the notification.
      const taskNameResult = await db.query(
        `SELECT task_title FROM tasks WHERE task_id = $1`,
        [task_id]
      );
      const task_title = taskNameResult.rows[0].task_title;

      // Retrieve issue title for the notification.
      const issueTitleResult = await db.query(
        `SELECT title FROM issues WHERE issue_id = $1`,
        [issue_id]
      );
      const issue_title = issueTitleResult.rows[0].title;

      // Retrieve sprint owner's id.
      const ownerResult = await db.query(
        `SELECT owner_id FROM sprints WHERE sprint_id = $1`,
        [sprint_id]
      );
      const sprint_owner_id = parseInt(ownerResult.rows[0].owner_id, 10);

      // Compose the notification message.
      const message = `All users have submitted a value for this issue ${issue_title} in task ${task_title}`;
    
      await db.query(
        `INSERT INTO notifications (user_id, repo_id, task_id, issue_id, sprint_id, type, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sprint_owner_id, repo_id, task_id, issue_id, sprint_id, 'TIMESTAMP-COMPLETED', message]
      );
      
      // Push notification to the sprint owner.
      sendNotification(sprint_owner_id, message);
    }
    
    await db.query('COMMIT');
    res.status(200).json({ message: 'Confirmed successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error confirming players for issue:', error);
    res.status(500).json({ error: 'Failed to confirm' });
  }
});

router.post('/updateDates', async (req, res) => {
  const { issue_id, start_date, end_date } = req.body;
  try {
    // Begin a transaction
    await db.query('BEGIN');

    // 1. Get the old dates from task_issues for the issue.
    const oldDatesResult = await db.query(
      'SELECT start_date, end_date FROM task_issues WHERE issue_id = $1',
      [issue_id]
    );

    let old_start_date = null, old_end_date = null;
    if (oldDatesResult.rows.length > 0) {
      old_start_date = oldDatesResult.rows[0].start_date;
      old_end_date = oldDatesResult.rows[0].end_date;
    }

    // 2. Update task_issues with the new start_date and end_date.
    await db.query(
      `UPDATE task_issues 
       SET start_date = $1, end_date = $2 
       WHERE issue_id = $3`,
      [start_date, end_date, issue_id]
    );

    // 3. Retrieve all user IDs assigned to this issue.
    const userResult = await db.query(
      'SELECT user_id FROM issue_assignments WHERE issue_id = $1',
      [issue_id]
    );
    const userIds = userResult.rows.map(row => row.user_id);
    for (const user_id of userIds) {
      if (old_start_date && old_end_date) {
        await db.query(
          `
          WITH old_dates AS (
            SELECT generate_series($1::date, $2::date, '1 day') AS d
          ),
          new_dates AS (
            SELECT generate_series($3::date, $4::date, '1 day') AS d
          )
          UPDATE user_availability
          SET is_free = true
          WHERE user_id = $5
            AND date IN (
              SELECT d FROM old_dates
              EXCEPT
              SELECT d FROM new_dates
            )
          `,
          [old_start_date, old_end_date, start_date, end_date, user_id]
        );
      }
      await db.query(
        `
        WITH new_dates AS (
          SELECT generate_series($1::date, $2::date, '1 day') AS d
        )
        UPDATE user_availability
        SET is_free = false
        WHERE user_id = $3
          AND date IN (SELECT d FROM new_dates)
        `,
        [start_date, end_date, user_id]
      );
    }

    // Commit the transaction
    await db.query('COMMIT');
    res.status(200).json({ message: 'Dates updated successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error updating dates:', error);
    res.status(500).json({ error: 'Failed to update dates' });
  }
});




router.get("/activeIssues/:user_id/", async (req, res)=>{
  const {user_id} = req.params;
  try{
    const result = await db.query(
      `SELECT * FROM 
      task_issues ti
      JOIN issue_assignments ia
      ON ti.issue_id = ia.issue_id
      JOin issues i  On i.issue_id = ia.issue_id
      join tasks as t on t.task_id = ti.task_id
      join sprints as s on s.sprint_id = t.sprint_id
      where ia.user_id  = ${user_id} 
      and i.state !='closed' `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching active issues:', error);
    res.status(500).json({ error: 'Failed to fetch active issues' });
  }
});
router.post('/addingTask/:sprint_id', async (req, res)=>{
  const {sprint_id} = req.params;
  const { task_name, repo_id, issues,issueAssignments ,sprint_name} = req.body;
  try{
    await db.query('BEGIN');
    
    const notificationsToSend = [];
    const query1 = `INSERT INTO  tasks (sprint_id, task_title, repo_id ) VALUES ($1, $2, $3) returning task_id`;
    const result = await db.query(query1,[sprint_id,task_name, repo_id]); 
    const task_id = result.rows[0].task_id;

    // Insert issues and assignments
    for (const issue of issues) {
      const { issue_id } = issue;

      // Insert the issue into task_issues junction table
      await db.query(
        `INSERT INTO task_issues (task_id, issue_id)
         VALUES ($1, $2)`,
        [task_id, issue_id]
        
      );
      const issue_name_result = await db.query(
        `SELECT title FROM issues WHERE issue_id = $1`,
        [issue_id]
      );
      const issue_name = issue_name_result.rows[0].title;
      const assignees = issueAssignments[Number(issue_id)];
      // Assign users to the issue
      for (const user of assignees) {
        await db.query(
          `INSERT INTO issue_assignments (task_id, issue_id, user_id,owner_id)
           VALUES ($1, $2, $3,$4)`,
          [task_id, issue_id, user.user_id,assignees[0].user_id]
        );
        await db.query(`
          INSERT INTO notifications (user_id,repo_id,task_id,issue_id,sprint_id,type,message  )
          VALUES ($1, $2, $3,$4,$5,$6,$7)
        `, [
          user.user_id,
          repo_id,
          task_id,
          issue_id,
          sprint_id,
          'TIMESTAMP',
          `You have been assigned to "${issue_name}" in the task "${task_name}" of sprint "${sprint_name}". Please estimate how long it will take.`,
        ]);
        notificationsToSend.push({
          user_id: user.user_id,
          repo_id,
          task_id,
          issue_id,
          sprint_id,
          message: `You have been assigned to "${issue_name}" in the task "${task_name}" of sprint "${sprint_name}". Please estimate how long it will take.`,
        });
      }
    }
  

  // Commit transaction
  await db.query('COMMIT');
  for (const notif of notificationsToSend) {
    // sendNotification could be from a global utility imported here
     sendNotification(notif.user_id,  notif.message );
  }

  res.status(201).json({ message: 'Sprint created successfully', sprint_id });

  }
  catch (error) {
    await db.query('ROLLBACK');
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
})
router.post('/addUserToIssue/:task_id/:issue_id', async (req, res)=>{
  const {task_id,issue_id} = req.params;
  const { user_ids} = req.body;
  try{
    await db.query('BEGIN');
    const notification = []
    const task = await db.query(`SELECT * FROM tasks WHERE task_id = $1`,[task_id]);
    const sprint = await db.query(`SELECT * FROM sprints WHERE sprint_id = $1`,[task.rows[0].sprint_id]);
    const task_name = task.rows[0].task_title;
    const repo_id = task.rows[0].repo_id;
    const sprint_name = sprint.rows[0].sprint_name;
    const issue = await db.query(`SELECT * FROM issues WHERE issue_id = $1`,[issue_id]);
    const issue_name = issue.rows[0].title;
    const sprint_id = task.rows[0].sprint_id;
    

    // Fetch existing user assignments for the issue in this task
    const existingAssignments = await db.query(
      `SELECT user_id FROM issue_assignments WHERE task_id = $1 AND issue_id = $2`,
      [task_id, issue_id]
    );

    const existingUserIds = existingAssignments.rows.map(row => row.user_id);

    // Determine users to add and users to remove
    const usersToAdd = user_ids.filter(user_id => !existingUserIds.includes(user_id));
    const usersToRemove = existingUserIds.filter(user_id => !user_ids.includes(user_id));

    // Remove users that are no longer assigned
    for (const user_id of usersToRemove) {
      await db.query(
      `DELETE FROM issue_assignments WHERE task_id = $1 AND issue_id = $2 AND user_id = $3`,
      [task_id, issue_id, user_id]
      );
      await db.query(
      `DELETE FROM notifications WHERE task_id = $1 AND issue_id = $2 AND user_id = $3`,
      [task_id, issue_id, user_id]
      );
    }

    // Add new users
    for (const user_id of usersToAdd) {
      await db.query(
      `INSERT INTO issue_assignments (task_id, issue_id, user_id,owner_id)
       VALUES ($1, $2, $3,$4)`,
      [task_id, issue_id, user_id,user_id]
      );
      await db.query(`
      INSERT INTO notifications (user_id, repo_id, task_id, issue_id, sprint_id, type, message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
      user_id,
      repo_id,
      task_id,
      issue_id,
      sprint_id,
      'TIMESTAMP',
      `You have been assigned to "${issue_name}" in the task "${task_name}" of sprint "${sprint_name}". Please estimate how long it will take.`,
      ]);
      notification.push({
      user_id,
      repo_id,
      task_id,
      issue_id,
      sprint_id,
      message: `You have been assigned to "${issue_name}" in the task "${task_name}" of sprint "${sprint_name}". Please estimate how long it will take.`,
      });
    }
  
    await db.query('COMMIT');
    for (const notif of notification) {
      // sendNotification could be from a global utility imported here
      sendNotification(notif.user_id,  notif.message );
    }
    res.status(201).json({ message: 'User added to issue successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error adding user to issue:', error);
    res.status(500).json({ error: 'Failed to add user to issue' });
  }
})





router.delete('/deleteIssue/:taskId/issue/:issueId', async (req, res) => {
  const { taskId, issueId } = req.params;

  try {
    await db.query('BEGIN');

    // ✅ Check if any other issues still depend on this one and are still active
    const dependencyCheck = await db.query(
      `SELECT * FROM issue_dependencies 
      JOIN task_issues ti ON ti.issue_id = issue_dependencies.issue_id
      WHERE depends_on_issue_id = $1 AND ti.task_id IS NOT NULL`,
      [issueId]
    );
    

    if (dependencyCheck.rows.length > 0) {
      await db.query('COMMIT');
      return res.status(400).json({ 
        message: 'Issue cannot be removed because other active issues depend on it.' 
      });
    }
    // ✅ Remove the issue from task_issues table
    const deleteResult = await db.query(
      `DELETE FROM task_issues WHERE task_id = $1 AND issue_id = $2 RETURNING *`,
      [taskId, issueId]
    );
    // ✅ Remove issue assignments related to this task and issue
    await db.query(
      `DELETE FROM issue_assignments WHERE task_id = $1 AND issue_id = $2`,
      [taskId, issueId]
    );

    

    if (deleteResult.rowCount === 0) {
      throw new Error(`Issue with ID ${issueId} not found in this task.`);
    }

    await db.query('COMMIT');

    res.json({ message: 'Issue removed from task successfully' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error removing issue from task:', error.message);
    res.status(500).json({ error: 'Failed to remove issue from task' });
  }
});


module.exports = router;
