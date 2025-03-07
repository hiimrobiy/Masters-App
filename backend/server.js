
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const db = require('./db'); // Import database connection from db.js
const axios = require('axios');

const session = require('express-session');
const {createRepository, fetchAndSaveRepositoriesIssuesAndCollaborators,addUserToRepository } = require('./githubApi');
const app = express();
app.use(
  cors({
    origin: 'http://localhost:3000', // Allow requests from the frontend
    credentials: true, // Allow cookies to be sent
  })
);
const sessionMiddleware = session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
  },
});
app.use(sessionMiddleware);
app.use(express.json());



// Import the tasks, edges, and repositories routes
const taskRoutes = require('./routes/tasks'); // Assuming tasks.js is in a 'routes' folder
const edgeRoutes = require('./routes/edges');
const repositoryRoutes = require('./routes/repositories');
const collaboratorsRoutes = require('./routes/collaborators');
const sprintsRoutes = require('./routes/sprints');
const dependenciesRoutes = require('./routes/dependencies');
const storiesRoutes = require('./routes/stories');
const authRoutes = require('./routes/auth');
const notificationsRoutes = require('./routes/notifications');
const availabilityRoutes = require('./routes/availability');
const userProfileRoutes = require('./routes/userprofile');
const riskRoutes   = require('./routes/risk');
const issueRoutes   = require('./routes/issue');
const projectRoutes   = require('./routes/project');
const  {initNotificationService, sendNotification  } = require('./notificationService');


// Track active WebSocket clients
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const clients = new Map();
initNotificationService(clients);

// Upgrade HTTP request to WebSocket
server.on('upgrade', (request, socket, head) => {
  sessionMiddleware(request, {}, () => {
    if (!request.session || !request.session.user) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', (ws, req) => {
  const userId = req.session.user?.id;
  if (userId) {
    clients.set(userId, ws);
  }

  ws.on('close', () => clients.delete(userId));
  

});


// Function to broadcast a message to all connected WebSocket clients
function broadcastToClients(message) {
  for (const [userId, ws] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}



// Endpoint to handle GitHub webhook
app.post('/api/github-webhook', async (req, res) => {
  const event = req.headers['x-github-event']; // Get the type of GitHub event
  const payload = req.body;
  const { action, issue, repository } = req.body;

  try {
    if (event === 'issues' && action === 'opened') {
      // Handle Issue Creation Event
      const newIssue = {
        issue_id: payload.issue.id, // Using GitHub's issue ID
        repo_id: payload.repository.id, // Link issue to the repository
        title: payload.issue.title,
        description: payload.issue.body,
        assignee: payload.issue.user.login,
        priority: 'normal', // Default priority
        comments_count: payload.issue.comments,
        labels: payload.issue.labels.map(label => label.name),
        milestone: payload.issue.milestone ? payload.issue.milestone.title : null,
        url: payload.issue.html_url,
        position_x: 100, // Default X position
        position_y: 100, // Default Y position
        created_at: payload.issue.created_at,
        updated_at: payload.issue.updated_at,
        state: payload.issue.state,
      };

      // Insert new issue into the database
      const result = await db.query(
        `INSERT INTO issues 
          (issue_id, repo_id, title, description, assignee, priority, comments_count, labels, milestone, url, position_x, position_y, created_at, updated_at, state) 
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (issue_id) DO NOTHING
         RETURNING *`,
        [
          newIssue.issue_id,
          newIssue.repo_id,
          newIssue.title,
          newIssue.description,
          newIssue.assignee,
          newIssue.priority,
          newIssue.comments_count,
          JSON.stringify(newIssue.labels),
          newIssue.milestone,
          newIssue.url,
          newIssue.position_x,
          newIssue.position_y,
          newIssue.created_at,
          newIssue.updated_at,
          newIssue.state,
        ]
      );

      if (result.rows.length > 0) {
        // Broadcast the new issue to connected WebSocket clients
        broadcastToClients({ type: 'issue', data: result.rows[0] });
      }

      res.status(201).json({ message: 'Issue created successfully', issue: result.rows[0] || newIssue });

    } 
    else if (event === 'issues' && action === 'closed') {
      const action = payload.action; // e.g., "closed"
      const issueId = payload.issue.id;
  
      if (action === 'closed') {
        try {
          // Remove issue from the database
          await db.query('DELETE FROM issues WHERE issue_id = $1', [issueId]);
  
          console.log(`Issue ${issueId} removed from the database.`);
  
          // Notify the frontend (if needed, via WebSocket or similar)
          // Example: Emit an event to the connected frontend
          // io.emit('issue_closed', { issueId });
  
          return res.status(200).send({ message: 'Issue removed successfully.' });
        } catch (error) {
          console.error('Error removing issue:', error.message);
          return res.status(500).send({ error: 'Failed to remove issue.' });
        }
      }
    }
    
    else if (event === 'repository' && action === 'created') {
      // Handle Repository Creation Event
      const newRepository = {
        repo_id: repository.id,
        name: repository.name,
        created_at: repository.created_at,
      };

      // Insert new repository into the database
      const result = await db.query(
        `INSERT INTO repositories (repo_id, name, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (repo_id) DO NOTHING
         RETURNING *`,
        [newRepository.repo_id, newRepository.name, newRepository.created_at]
      );

      if (result.rows.length > 0) {
        // Broadcast the new repository to connected WebSocket clients
        broadcastToClients({ type: 'repository', data: result.rows[0] });
      }

      res.status(201).json({ message: 'Repository created successfully', repository: result.rows[0] || newRepository });

    } else {
      res.status(200).send('Event not handled');
    }

  } catch (error) {
    console.error('Error handling GitHub webhook:', error);
    res.status(500).json({ message: 'Failed to handle event', error: error.message });
  }
});

//za button manaulno dodavanje
app.post('/api/create-repository/:project_id', async (req, res) => {
  const { repoName,owner_id ,accessToken} = req.body;
  const {project_id } = req.params;
  //console.log(repoName);
  try {
    // Call your GitHub API function to create a repository
    const repoData = await createRepository(repoName,accessToken);
     await db.query("BEGIN")
        const result = await db.query(
          'INSERT INTO repositories (repo_id,repo_name,owner_id) VALUES ($1,$2,$3) RETURNING *',
          [repoData.id,repoData.name,owner_id]
        );
        if(result.rowCount>0){
          const repo_id = result.rows[0].repo_id;
          const result2 = await db.query(
            `Insert into project_repo (repo_id,project_id) VALUES ($1,$2) `,[repo_id,project_id]
          )
          const result3 = await db.query(`
            INSERT into repo_user
            (repo_id,user_id)
            values ($1,$2)
            `,
            [repo_id,owner_id]
          );
            
      }
      await db.query("COMMIT")
    res.status(201).json({ message: 'Repository created successfully', repository: repoData });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error('Error creating repository:', error.message);
    res.status(500).json({ message: 'Failed to create repository', error: error.message });
  }
});

app.post('/api/add-existing-repository', async (req, res) => {
  try {
    const { repositoryUrl, projectId, userId, accessToken, login } = req.body;

    // Validate required fields
    if (!repositoryUrl || !projectId || !userId || !accessToken || !login) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Parse the repository URL.
    // Expected format: https://github.com/owner/repo
    const repoUrlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repositoryUrl.match(repoUrlPattern);
    if (!match) {
      return res.status(400).json({ message: 'Invalid repository URL.' });
    }
    const owner = match[1];
    const repoName = match[2];

    // Construct the URL to check if the user is a collaborator.
    // GitHub API: GET /repos/:owner/:repo/collaborators/:username
    const collaboratorUrl = `https://api.github.com/repos/${owner}/${repoName}/collaborators/${login}`;

    try {
      // This endpoint returns 204 if the user is a collaborator.
      const collaboratorResponse = await axios.get(collaboratorUrl, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (collaboratorResponse.status === 204) {
        // User is a collaborator.
        // Fetch the repository details.
        const repoDetailsUrl = `https://api.github.com/repos/${owner}/${repoName}`;
        const repoDetailsResponse = await axios.get(repoDetailsUrl, {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        const repoData = repoDetailsResponse.data;

        // Prepare repository data for your database.
        const dbRepo = {
          repo_id: repoData.id,
          repo_name: repoData.name,
          owner_id: repoData.owner.id,
          description: repoData.description,
          date_created: repoData.created_at,
          project_id: projectId,
          added_by: userId,
        };
        await db.query("BEGIN");
        const result = await db.query(
          `INSERT INTO repositories (repo_id, repo_name, owner_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (repo_id) DO UPDATE 
             SET repo_name = EXCLUDED.repo_name,
                 owner_id = EXCLUDED.owner_id
           RETURNING *`,
          [dbRepo.repo_id, dbRepo.repo_name, dbRepo.owner_id]
        );
      
        if (result.rowCount > 0) {
          const repo_id = result.rows[0].repo_id;
      
          // Insert into project_repo. On conflict, update with the same values (or any other columns if applicable).
          await db.query(
            `INSERT INTO project_repo (repo_id, project_id)
             VALUES ($1, $2)
             ON CONFLICT (repo_id, project_id) DO UPDATE 
               SET repo_id = EXCLUDED.repo_id,
                   project_id = EXCLUDED.project_id`,
            [repo_id, projectId]
          );
      
          // Insert into repo_user. On conflict, update with the same values.
          await db.query(
            `INSERT INTO repo_user (repo_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (repo_id, user_id) DO UPDATE 
               SET repo_id = EXCLUDED.repo_id,
                   user_id = EXCLUDED.user_id`,
            [repo_id, userId]
          );
        }
      await db.query("COMMIT")
        return res.status(200).json({
          message: 'Repository added successfully.',
          repository: dbRepo,
        });
      } else {
        // If the status is not 204, consider the user is not a collaborator.
        return res.status(403).json({ message: 'User is not a collaborator on this repository.' });
      }
    } catch (error) {
      await db.query("ROLLBACK");
      // If GitHub returns a 404, then the user is not a collaborator.
      if (error.response && error.response.status === 404) {
        return res.status(403).json({ message: 'User is not a collaborator on this repository.' });
      }
      console.error('Error checking collaborator:', error.message);
      return res.status(500).json({ message: 'Error checking repository collaboration.' });
    }
  } catch (err) {
    console.error('Internal server error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});
app.post('/api/repos/:repoId/add-collaborator', async (req, res) => {
  const { repoId } = req.params;
  const { owner, repoName, collaboratorUsername, permission, projectId, userId, accessToken } = req.body;
  if (!owner ||!repoName ||!collaboratorUsername ||!permission ||!projectId ||!userId ||!accessToken) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  try {
    const ownerName = await db.query('SELECT name FROM users WHERE user_id = $1', [owner]);
    const url = `https://api.github.com/repos/${ownerName.rows[0].name}/${repoName}/collaborators/${collaboratorUsername}`;
    const response = await axios.put(url, { permission }, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 201) {
      // 201 Created means an invitation was sent.
      // Update your database accordingly—for example, mark that the user was invited.
      await db.query(
        `INSERT INTO repo_user (repo_id, user_id, invited)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [repoId, collaboratorUsername]
      );
      return res.status(200).json({ message: 'Invitation sent successfully.' });
    } else if (response.status === 204) {
      // 204 No Content indicates the user is already a collaborator.
      return res.status(200).json({ message: 'User is already a collaborator.' });
    } else {
      // If you get a different status code, you may want to handle it.
      return res.status(response.status).json({ message: 'Unexpected response from GitHub.' });
    }
  } catch (error) {
    console.error('Error adding collaborator:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data || error.message });
  }
});

// Use the task, edge, and repository routes with appropriate base URLs
app.use('/tasks', taskRoutes);
app.use('/story', storiesRoutes);
app.use('/edges', edgeRoutes);
app.use('/sprints', sprintsRoutes);
app.use('/repositories', repositoryRoutes);
app.use('/dependencies', dependenciesRoutes);
app.use('/auth', authRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/availability', availabilityRoutes);
app.use('/userprofile', userProfileRoutes);
app.use('/risk', riskRoutes);
app.use('/issue', issueRoutes);
app.use('/project', projectRoutes);
app.use('/collaborators', collaboratorsRoutes);
app.get('/api/fetch-repositories-and-issues/:accessToken/:user_id/:project_id', async (req, res) => {
  const {accessToken,user_id,project_id} = req.params;
  try {
    await  fetchAndSaveRepositoriesIssuesAndCollaborators(accessToken, project_id, user_id);
    res.status(200).json({ message: 'Repositories and issues fetched and saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch and save repositories and issues', error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function initializeAvailabilityForUser(userId) {
  const today = new Date();
  const daysToPopulate = 60;

  // Sunday = 0, Wednesday = 3 in getDay()
  for (let i = 0; i < daysToPopulate; i++) {
    const current = new Date(today);
    current.setDate(today.getDate() + i);
    const dayOfWeek = current.getDay();
    const isFree = (dayOfWeek !== 0 && dayOfWeek !== 6) || (userId%13==0);

    const dateString = current.toISOString().substring(0, 10); // YYYY-MM-DD format
    await db.query(
      `INSERT INTO user_availability (user_id, date, is_free)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET is_free = EXCLUDED.is_free`,
      [userId, dateString, isFree]
    );
  }
}

async function initializeAllUsersAvailability() {
  try {
    // Fetch all user_ids from the users table
    const result = await db.query('SELECT user_id FROM users');
    const users = result.rows; // Array of { user_id: number }

    if (users.length === 0) {
    return;
    }

    for (const user of users) {
       await initializeAvailabilityForUser(user.user_id);
     }
    } catch (error) {
    console.error("Error initializing all users' availability:", error);
  } 
}

//initializeAllUsersAvailability();