import React, { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';

const NotificationBell = ({ onOpenChat }) => {
  const { 
    notifications, 
    unreadCount, 
    loading,
    markAsRead, 
    fetchNotifications
  } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.notification-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const totalUnread = unreadCount;

  const handleOpenChat = (room) => {
    if (onOpenChat) {
      const otherParticipant = room.participants.find(id => id !== user._id);
      const chatInfo = {
        requestId: room.requestId,
        otherUserId: otherParticipant,
        otherUserName: otherParticipant === 'client-user-id' ? 'Client' : 'Provider',
        otherUserRole: otherParticipant === 'client-user-id' ? 'client' : 'provider'
      };
      
      onOpenChat(chatInfo);
      setShowDropdown(false); // Close the dropdown after opening chat
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
      
      {/* Notifications Dropdown */}
      {showDropdown && (
        <div className="notification-dropdown absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex border-b border-gray-200">
            <div className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              <Bell className="h-4 w-4 inline mr-2" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="px-3 py-3 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            <div className="p-4">
              {loading ? (
                <div className="text-center text-gray-500 py-8">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-spin" />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice(0, 10).map((notification, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        markAsRead(index);
                        // Handle different notification types
                        if (notification.type === 'chat_message' && notification.data?.roomId) {
                          navigate(`/chat/${notification.data.roomId}`);
                          setShowDropdown(false);
                        } else if (notification.type === 'new_bid' && notification.data?.requestId) {
                          // Navigate to the request details or dashboard
                          navigate('/dashboard');
                          setShowDropdown(false);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          {notification.type === 'chat_message' && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full mt-1 inline-block">
                              Click to open chat
                              </span>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="ml-2 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                  <button
                    onClick={fetchNotifications}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
