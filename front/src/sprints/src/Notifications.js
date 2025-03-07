import { useRef } from 'react';
import { useEffect, useState } from 'react';

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    // Establish WebSocket connection
    ws.current = new WebSocket('ws://localhost:5000');

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setNotifications((prev) => [...prev, message]);
    };

    ws.current.onclose = () => console.log('WebSocket disconnected');
    return () => ws.current.close(); // Clean up
  }, []);

  return (
    <div className="notification-container">
      {notifications.map((notification, index) => (
        <div key={index} className="notification">
          {notification.message}
        </div>
      ))}
    </div>
  );
};

export default Notification;
