import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Connect to socket when user is logged in
      const socketInstance = io('https://food-live-tracker.onrender.com');

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to socket server');
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from socket server');
      });

      setSocket(socketInstance);

      // Cleanup on unmount or user logout
      return () => {
        socketInstance.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
