import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    // Redirect to login if the user is not authenticated
    return <Navigate to="/Login" />;
  }

  // Render the protected component if authenticated
  return children;
};

export default ProtectedRoute;
