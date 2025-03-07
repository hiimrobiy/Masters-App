import axios from 'axios';
import React, { createContext, useEffect, useRef, useContext } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ user, children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && !socketRef.current) {
      // Initialize WebSocket connection after user is authenticated
      socketRef.current = new WebSocket('ws://localhost:5000');

      socketRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

      socketRef.current.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const messageData = JSON.parse(event.data);
          console.log(event.data);
          if (messageData.type === 'NOTIFICATION' || messageData.type === 'TIMESTAMP') {
            // Use toast notification
            toast.info(messageData.content, {
              position: "top-right",
              autoClose: 5000, // 5 seconds
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
            });
          }
        } catch (error) {
          // If event.data is not JSON, just show a generic message
          toast.info(`Notification: ${event.data}`);
        }
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket closed');
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    }
  }, [user]);
  useEffect(() => {
    // Reset WebSocket connection when user is logged out
    if (user) {
      async function getNotification(userId){
        const notifications = await axios.get(`http://localhost:5000/notifications/${userId}`,{withCredentials: true});
        notifications.data.forEach(element => {
          try {
             const messageData = element.message;  
            if ((element.type === 'NOTIFICATION' || element.type === 'TIMESTAMP') && (!element.is_read)) {
              // Use toast notification
              toast.info(element.message, {
                position: "top-right",
                autoClose: 5000, // 5 seconds
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
              });
            }
          } catch (error) {
            // If event.data is not JSON, just show a generic message
            toast.info(`Notification: error`);
          }
          
        });
      }
      getNotification(user.id);
    }
    
  }, []);

  return (
    <WebSocketContext.Provider value={socketRef.current}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
