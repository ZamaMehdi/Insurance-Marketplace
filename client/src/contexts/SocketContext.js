import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, socket }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (socket && isAuthenticated && user?._id) {
      // Socket is already connected from App.js, just set connected state
      setIsConnected(true);

      // Connection event handlers
      socket.on('connect', () => {
        setIsConnected(true);
        
        // Join user's personal room
        if (user?._id) {
          socket.emit('join_room', user._id);
        }
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        setIsConnected(false);
      });

      socket.on('error', (error) => {
        // Handle socket errors silently
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        // Handle reconnection attempts silently
      });

      socket.on('reconnect_failed', () => {
        // Handle reconnection failures silently
      });

      // Note: Notifications are handled by SocketConnector component
      // to avoid conflicts with NotificationContext

      // Cleanup on unmount
      return () => {
        // Don't disconnect here since socket is managed in App.js
      };
    }
  }, [socket, isAuthenticated, user?._id]);

  // Reconnect when user changes
  useEffect(() => {
    if (socket && user?._id && isConnected) {
      socket.emit('join_room', user._id);
    }
  }, [user?._id, socket, isConnected]);

  const value = {
    socket,
    isConnected,
    emit: (event, data) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      }
    },
    on: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
      }
    },
    off: (event, callback) => {
      if (socket) {
        socket.off(event, callback);
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};


