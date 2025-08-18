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
      console.log('🔌 SocketContext: Attempting to connect to socket...');
      console.log('🔌 SocketContext: Socket instance:', socket);
      console.log('🔌 SocketContext: User authenticated:', isAuthenticated);
      console.log('🔌 SocketContext: User ID:', user._id);
      
      // Socket is already connected from App.js, just set connected state
      setIsConnected(true);

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        
        // Join user's personal room
        if (user?._id) {
          socket.emit('join_room', user._id);
          console.log(`🔌 User ${user._id} joined room: user_${user._id}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
        console.error('🔌 Error details:', {
          message: error.message,
          type: error.type,
          description: error.description
        });
        setIsConnected(false);
      });

      socket.on('error', (error) => {
        console.error('🔌 Socket error event:', error);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔌 Reconnection attempt:', attemptNumber);
      });

      socket.on('reconnect_failed', () => {
        console.error('🔌 Reconnection failed');
      });

      // Note: Notifications are handled by SocketConnector component
      // to avoid conflicts with NotificationContext

      // Cleanup on unmount
      return () => {
        // Don't disconnect here since socket is managed in App.js
        console.log('🔌 SocketContext: Cleaning up socket listeners');
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


