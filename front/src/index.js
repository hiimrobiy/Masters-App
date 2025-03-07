import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import { WebSocketProvider } from './WebSocketListener';
import './index.css'; // assuming you have global CSS
import 'react-toastify/dist/ReactToastify.css';

const Root = () => {
  const [user, setUser] = useState(undefined); // use undefined initially to distinguish "unknown" state

  useEffect(() => {
    // Attempt to fetch authenticated user
    axios
      .get('http://localhost:5000/auth/user', { withCredentials: true })
      .then((response) => {
        setUser(response.data);
      })
      .catch((error) => {
        // If user is not authenticated, set user to null
        setUser(null);
      });
  }, []);

  if (user === undefined) {
    // Optionally render a loading indicator while checking authentication
    return <div>Loading...</div>;
  }

  // If user is null or a valid user object is set, we can render the app
  return (
    <WebSocketProvider user={user}>
      <App user={user} />
    </WebSocketProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
