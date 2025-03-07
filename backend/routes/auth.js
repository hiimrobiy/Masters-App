require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');

const app = express();
app.use(express.json());



// GitHub OAuth credentials
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Step 1: Redirect to GitHub login
app.get('/github', (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user`;
  res.redirect(redirectUri);
});

// Step 2: Handle GitHub callback
app.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange the code for an access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user data
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = userResponse.data;

    // Save user session
    req.session.user = { accessToken, ...userData };

    // Send user back to the frontend
    res.redirect('http://localhost:3000/');
  } catch (error) {
    console.error('Error during GitHub OAuth:', error.message);
    res.status(500).send('Authentication failed');
  }
});

// Step 3: Get current user (protected route)
app.get('/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Step 4: Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.send({ message: 'Logged out successfully' });
  });
});

module.exports = app; // Export for your main server file
