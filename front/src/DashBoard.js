import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [authFailed, setAuthFailed] = useState(false); // Track authentication failure

  useEffect(() => {
    axios
      .get('http://localhost:5000/auth/user', { withCredentials: true }) // Verify session
      .then((response) => {
        setUser(response.data); // User is logged in
        setAuthFailed(false); // Reset authFailed if previously set
      })
      .catch(() => {
        setAuthFailed(true); // Mark authentication as failed
      });
  }, []);

  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/github';
  };

  if (authFailed) {
    return (
      <div>
        <button onClick={handleLogin}>Login with GitHub</button>
      </div>
    );
  }

  if (!user) {
    return <div>Loading...</div>; // Show a loading state while verifying the session
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <img src={user.avatar_url} alt="Avatar" />
    </div>
  );
};

export default Dashboard;
