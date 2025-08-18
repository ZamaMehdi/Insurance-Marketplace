import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Handle notifications from the shared data store
  const handleNotification = useCallback((type, data) => {
    console.log('Notification received:', type, data);
    
    let title = 'New Notification';
    let message = data.message || 'You have a new notification';
    
    // Set appropriate title and message based on type
    switch (type) {
      case 'new_bid':
        title = 'New Bid Received';
        message = data.message || `New bid received on your insurance request`;
        break;
      
      case 'bid_accepted':
        title = 'Bid Accepted!';
        message = data.message || `Your bid has been accepted!`;
        break;
      
      case 'bid_rejected':
        title = 'Bid Rejected';
        message = data.message || `Your bid was rejected`;
        break;
      
      case 'new_request':
        title = 'New Request';
        message = data.message || `New insurance request available`;
        break;
      
      case 'chat_message':
        title = 'New Message';
        message = data.message || `You have a new message`;
        break;
    }
    
    const newNotification = {
      id: Date.now(),
      type,
      title,
      message,
      data,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  });

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Update backend
      await apiService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  });

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Update backend
      await apiService.markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  });

  // Clear notification
  const clearNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const newNotifications = prev.filter(notif => notif.id !== notificationId);
      const unreadNotifications = newNotifications.filter(notif => !notif.read);
      setUnreadCount(unreadNotifications.length);
      return newNotifications;
    });
  });

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  });

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notif => notif.type === type);
  });

  // Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notif => !notif.read);
  });

  // Add a notification manually (for testing or external sources)
  const addNotification = useCallback((type, data) => {
    handleNotification(type, data);
  });

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔔 Fetching notifications from backend...');
      
      const response = await apiService.getNotifications();
      console.log('🔔 Backend notifications response:', response);
      
      if (response && response.notifications) {
        // Transform backend notifications to frontend format
        const transformedNotifications = response.notifications.map(notif => ({
          id: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          data: notif.data,
          timestamp: new Date(notif.createdAt),
          read: notif.read,
          category: notif.category,
          priority: notif.priority,
          actionUrl: notif.actionUrl
        }));
        
        setNotifications(transformedNotifications);
        
        // Calculate unread count
        const unreadNotifications = transformedNotifications.filter(notif => !notif.read);
        setUnreadCount(unreadNotifications.length);
        
        console.log('🔔 Transformed notifications:', transformedNotifications);
        console.log('🔔 Unread count:', unreadNotifications.length);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count from backend
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiService.getUnreadCount();
      if (response && response.count !== undefined) {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
    }
  }, []);

  // Fetch notifications on mount only if user is authenticated
  useEffect(() => {
    // Only fetch if we have a valid user session
    if (user && user._id) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount, user]);

  // Handle chat message notifications
  const handleChatMessage = useCallback((data) => {
    const newMessage = {
      id: Date.now(),
      type: 'chat_message',
      roomId: data.roomId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      timestamp: data.timestamp,
      read: false
    };

    setMessages(prev => [newMessage, ...prev]);
    setUnreadMessageCount(prev => prev + 1);

    // Also add as a general notification
    const newNotification = {
      id: Date.now(),
      type: 'chat_message',
      title: 'New Message',
      message: `New message from ${data.senderName}`,
      data: data,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  });

  // Mark message as read
  const markMessageAsRead = useCallback((messageId) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, read: true }
          : msg
      )
    );
    setUnreadMessageCount(prev => Math.max(0, prev - 1));
  });

  // Mark all messages as read
  const markAllMessagesAsRead = useCallback(() => {
    setMessages(prev => 
      prev.map(msg => ({ ...msg, read: true }))
    );
    setUnreadMessageCount(0);
  });

  const value = {
    notifications,
    unreadCount,
    messages,
    unreadMessageCount,
    loading,
    markAsRead,
    markAllAsRead,
    markMessageAsRead,
    markAllMessagesAsRead,
    clearNotification,
    clearAllNotifications,
    getNotificationsByType,
    getUnreadNotifications,
    addNotification,
    handleChatMessage,
    fetchNotifications,
    fetchUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
