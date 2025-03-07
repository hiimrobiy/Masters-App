import React, { useEffect } from 'react';

const Logout = () => {
  useEffect(() => {
    const performLogout = async () => {
      try {
        // Send logout request to your server
        const response = await fetch('http://localhost:5000/auth/logout', {
          method: 'GET', // or 'POST' if your server expects POST
          credentials: 'include', // ensure cookies are included if needed
        });
        
        if (response.ok) {
          // If server indicates success, redirect to login page
          window.location.href = '/login';
        } else {
          // If server responds with an error status, go back to previous page
          // or handle differently if you have a custom error flow
          window.history.back();
        }
      } catch (error) {
        // On network error or fetch failure, also go back
        window.history.back();
      }
    };

    performLogout();
  }, []);

  // You can return a small loading message or spinner while the effect runs
  return <p>Logging out...</p>;
};

export default Logout;
