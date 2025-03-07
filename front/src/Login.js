import React from 'react';
import './Login.css'; // We'll create this CSS file

const Login = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/github';
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo or Title */}
        <h2 className="login-title">Welcome to MyApp</h2>
        <p className="login-subtitle">Please log in via GitHub to continue.</p>

        <button className="login-button" onClick={handleLogin}>
          Login with GitHub
        </button>
      </div>
    </div>
  );
};

export default Login;
