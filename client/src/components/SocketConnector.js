import React, { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import toast from 'react-hot-toast';

const SocketConnector = () => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { handleChatMessage, addNotification } = useNotifications();

  useEffect(() => {
    if (socket && isConnected && user) {
      console.log('🔌 SocketConnector: Socket connected successfully');
      
      // Join user's personal room for notifications
      socket.emit('join_user_room', { userId: user._id });
      console.log('🔌 SocketConnector: Emitted join_user_room for user:', user._id);
      
      // Test socket connection
      socket.emit('test_notification', { message: 'Testing socket connection' });
      console.log('🧪 SocketConnector: Emitted test_notification');
      
      // Listen for global chat notifications
      socket.on('chat_notification', (data) => {
        console.log('🔔 SocketConnector: Received chat_notification:', data);
        if (data.type === 'new_message') {
          console.log('💬 Adding chat message to notification bell');
          // Add to notification bell
          handleChatMessage(data.data);
          
          // Also show toast notification
          toast.success(`${data.title}: ${data.message}`, {
            duration: 5000,
            icon: '💬',
            style: {
              background: '#10B981',
              color: '#fff',
            },
          });
        }
      });

      // Listen for new message notifications (from backend)
      socket.on('new_message', (data) => {
        console.log('🔔 SocketConnector: Received new_message:', data);
        // Add to notification bell
        handleChatMessage(data);
        
        // Show toast notification
        toast.success(`New message from ${data.senderName}`, {
          duration: 5000,
          icon: '💬',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
      });
      
      // Listen for new bid notifications (when provider submits bid)
      socket.on('new_bid_notification', (data) => {
        console.log('🔔 SocketConnector: Received new_bid_notification:', data);
        // Add to notification bell
        addNotification('new_bid', data);
        
        // Show toast notification
        toast.success(`New Bid Received!`, {
          duration: 5000,
          icon: '💰',
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
        });
      });

      // Listen for bid accepted notifications (when client accepts bid)
      socket.on('bid_accepted_notification', (data) => {
        console.log('🔔 SocketConnector: Received bid_accepted_notification:', data);
        // Add to notification bell
        addNotification('bid_accepted', data);
        
        // Show toast notification
        toast.success(`Bid Accepted!`, {
          duration: 5000,
          icon: '✅',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
      });

      // Listen for test notification response
      socket.on('test_notification_response', (data) => {
        console.log('🧪 SocketConnector: Received test response:', data);
        toast.success('Socket connection working!', {
          duration: 3000,
          icon: '✅',
        });
      });
      
      return () => {
        socket.off('chat_notification');
        socket.off('bid_notification');
        socket.off('test_notification_response');
      };
    }
  }, [socket, isConnected, user]);

  // This component doesn't render anything
  return null;
};

export default SocketConnector;
