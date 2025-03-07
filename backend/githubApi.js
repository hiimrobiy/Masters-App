require('dotenv').config();
const axios = require('axios');
const db = require('./db'); // Database connection
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Use environment variable for security
const GITHUB_API_URL = 'https://api.github.com';



// Function to create a new repository
async function createRepository(repoName,accessToken) {
  try {
    const response = await axios.post(
      `${GITHUB_API_URL}/user/repos`,
      {
        name: repoName,
        auto_init: true,
        private: false, // Set to true if you want the repository to be private
      },
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    //console.log('Repository created successfully:', response.data);
    return response.data; // Return repository details
  } catch (error) {
    console.error('Error creating repository:', error.response?.data || error.message);
    throw error;
  }
}
// Function to create a webhook for a repository
async function createWebhook(owner, repoName) {
  try {
    const response = await axios.post(
      `${GITHUB_API_URL}/repos/${owner}/${repoName}/hooks`,
      {
        name: 'web',
        config: {
          url: 'https://your-server.com/api/github-webhook', // Replace with your server webhook URL
          content_type: 'json',
        },
        events: ['issues', 'repository'], // Events to listen to
        active: true,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

   // console.log('Webhook created successfully:', response.data);
    return response.data; // Return webhook details
  } catch (error) {
    console.error('Error creating webhook:', error.response?.data || error.message);
    throw error;
  }
}

async function addUserToRepository(repoOwner, repoName, username, permission = 'admin') {
  try {
    const response = await axios.put(
      `${GITHUB_API_URL}/repos/${repoOwner}/${repoName}/collaborators/${username}`,
      { permission }, // optional: include permission if you want a specific level
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    // GitHub returns a 201 (Created) if an invitation was created,
    // or a 204 (No Content) if the user is already a collaborator.
    console.log('User added (or invited) successfully:', response.data);
    return response.data; // Note: response.data may be empty in case of a 204 status.
  } catch (error) {
    console.error('Error adding user to repository:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage:
// addUserToRepository('your-username', 'your-repo', 'collaborator-username', 'push');

async function getUserRepositories(username,token) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: { per_page: 100 },
    });

    return response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      createdAt: repo.created_at,
      owner_id: repo.owner.id, // Include the unique user_id
      owner_login: repo.owner.login,
      url:repo.html_url,

    }));
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    throw error;
  }
}
  

// Function to fetch repositories from GitHub
async function fetchRepositories(project_id,user_id) {
  try {
    const repoResult =  await db.query(`
      SELECT * from project_repo
      join repositories 
      ON project_repo.repo_id = repositories.repo_id
      join users on users.user_id = repositories.owner_id

  
      WHERE project_repo.project_id = $1 `,
      [project_id]);

    if (repoResult.rows.length === 0) {
      console.log('No repositories found for this project.');
      return [];
    }



    return repoResult.rows;
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    throw error;
  }
}
// Function to save repositories to the database
async function saveRepositoriesToDB(repositories) {
  const newIds = repositories.map((r) => r.id); 
  try {
    await db.query('BEGIN');

    // 1. Delete repos not in the new list:
    await db.query(
      `DELETE FROM repositories
       WHERE repo_id NOT IN (${newIds.join(',')})`
    );

    // 2. Insert or upsert the new ones:
    for (const repo of repositories) {
      await db.query(
        `INSERT INTO repositories (repo_id, repo_name, date_created, owner_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (repo_id)
         DO UPDATE SET
           repo_name = EXCLUDED.repo_name,
           date_created = EXCLUDED.date_created,
           owner_id = EXCLUDED.owner_id
        `,
        [repo.id, repo.name, repo.created_at, repo.owner_id]
      );
    }

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error syncing repositories:', error);
  }
}
// Function to fetch issues for a specific repository
async function fetchIssues(repoOwner, repoName,accessToken) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/repos/${repoOwner}/${repoName}/issues`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: { per_page: 100 },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching issues for ${repoName}:`, error.message);
    throw error;
  }
}
// Function to save issues to the database
async function saveIssuesToDB(issues, repoId) {
  for (const issue of issues) {
    const newIssue = {
      issue_id: issue.id, // <- Change this to issue.number if needed
      repo_id: repoId,
      title: issue.title,
      description: issue.body,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      state: issue.state,
      labels: JSON.stringify(issue.labels.map(label => label.name)),
      milestone: issue.milestone ? issue.milestone.title : null,
      url: issue.html_url,
      comments_count: issue.comments,
      issue_number: issue.number, // <- Ensure this is stored correctly
    };

    try {
      await db.query(
        `INSERT INTO issues 
          (issue_id, repo_id, title, description, created_at, updated_at, state, labels, milestone, url, comments_count, issue_number) 
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (issue_id) 
         DO UPDATE SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          updated_at = EXCLUDED.updated_at,
          state = EXCLUDED.state,
          labels = EXCLUDED.labels,
          milestone = EXCLUDED.milestone,
          url = EXCLUDED.url,
          comments_count = EXCLUDED.comments_count,
          issue_number = EXCLUDED.issue_number`,
        [
          newIssue.issue_id,
          newIssue.repo_id,
          newIssue.title,
          newIssue.description,
          newIssue.created_at,
          newIssue.updated_at,
          newIssue.state,
          newIssue.labels,
          newIssue.milestone,
          newIssue.url,
          newIssue.comments_count,
          newIssue.issue_number,
        ]
      );
      const status = newIssue.state === 'open' ? 'active' : 'closed';
      if(status === 'closed'){
       await db.query(`
        delete from issue_dependencies

        WHERE issue_id = $1 or depends_on_issue_id = $1`,
        [newIssue.issue_id]
        );
        await db.query(`
        delete from edges
        where source_id =$1 or
        target_id = $1`,
        )
        [newIssue.issue_id]
      }
      
        


      if (issue.assignees && issue.assignees.length > 0) {
        for (const assignee of issue.assignees) {
          // Ensure the user exists in the `users` table
          await db.query(
            `INSERT INTO users (user_id, name, profile_picture)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET name = EXCLUDED.name, profile_picture = EXCLUDED.profile_picture`,
            [assignee.id, assignee.login, assignee.avatar_url]
          );
          await db.query(
            `INSERT INTO user_issues (user_id, issue_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, issue_id) DO NOTHING`,
            [assignee.id, newIssue.issue_id]
          );
        }
      }
    } catch (error) {
      console.error(`Error saving issue ${issue.title}:`, error.message);
    }
  }
}

async function fetchIssueAssignments(owner, repoName,accessToken) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repoName}/issues`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: { per_page: 100 },
    });

    // Extract assignments (assignees and their issues)
    return response.data.map(issue => ({
      issue_id: issue.id,
      issue_number: issue.number,
      assignees: issue.assignees.map(assignee => ({
        user_id: assignee.id,
        login: assignee.login,
        profile_picture: assignee.avatar_url,
      })),
    }));
  } catch (error) {
    console.error(`Error fetching assignments for ${repoName}:`, error.message);
    throw error;
  }
}

async function saveIssueAssignmentsToDB(assignments,repo_id) {
  for (const { issue_id, assignees } of assignments) {
    for (const assignee of assignees) {
      try {
        // Ensure the user exists in the `users` table
        await db.query(
          `INSERT INTO users (user_id, name, profile_picture)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO NOTHING`,
          [assignee.user_id, assignee.login, assignee.profile_picture]
        );

        // Link the user to the issue and repository in the `assignments` table
        await db.query(
          `INSERT INTO user_issues (user_id, issue_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [assignee.user_id, issue_id]
        );
      } catch (error) {
        console.error(
          `Error saving assignment for user ${assignee.login} to issue ${issue_id} in repo ${repo_id}:`,
          error.message
        );
      }
    }
  }
  //console.log('All assignments saved to the database.');
}


async function fetchCollaborators(owner, repo,accessToken) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/collaborators`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching collaborators for ${repo}:`, error.message);
    return null;
  }
}
async function saveCollaboratorsToDB(collaborators, repoId) {
  for (const collaborator of collaborators) {
    const collaboratorData = {
      user_id: collaborator.id,
      name: collaborator.login,
      profile_picture: collaborator.avatar_url,
      repo_id: repoId,
    };

    try {
      // Insert collaborator data
      await db.query("BEGIN");
      await db.query(
        `INSERT INTO users (user_id, name, profile_picture)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [collaboratorData.user_id, collaboratorData.name, collaboratorData.profile_picture]
      );
      await db.query(`insert into repo_user (repo_id, user_id) values ($1, $2) 
         ON CONFLICT (repo_id,user_id) DO NOTHING`, [repoId, collaboratorData.user_id]);
      await db.query("COMMIT");

   //   console.log(`Collaborator ${collaboratorData.name} saved and linked to repository ${repoId}`);
    } catch (error) {
      await db.query("ROLLBACK");
      console.error(`Error saving collaborator ${collaboratorData.name}:`, error.message);
    }
  }
}
// Main function to fetch repositories, fetch issues for each repository, and save them to the database
async function fetchAndSaveRepositoriesIssuesAndCollaborators(accessToken,project_id,user_id) {
  try {
    // Step 1: Fetch and save repositories
    const repositories = await fetchRepositories(project_id,user_id);

 
    for (const repo of repositories) {
      const repoOwner = repo.name;
      const repoName = repo.repo_name;

      const collaborators = await fetchCollaborators(repoOwner, repoName,accessToken);
      if(collaborators==null) 
        continue;
      await saveCollaboratorsToDB(collaborators, repo.repo_id);

      const issues = await fetchIssues(repoOwner, repoName,accessToken);
      await saveIssuesToDB(issues, repo.repo_id);

    
      const assignments = await fetchIssueAssignments(repoOwner, repoName,accessToken);
      await saveIssueAssignmentsToDB(assignments,repo.repo_id);
    }

    //console.log('Repositories, issues, collaborators, and assignments saved successfully.');
  } catch (error) {
    console.error('Error in fetchAndSaveRepositoriesIssuesAndCollaborators:', error.message);
  }
}


module.exports = {createRepository: createRepository,
                  createWebhook: createWebhook,
                  fetchAndSaveRepositoriesIssuesAndCollaborators:fetchAndSaveRepositoriesIssuesAndCollaborators,
                  getUserRepositories: getUserRepositories,
                  addUserToRepository: addUserToRepository,
              }