import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  Send, 
  MessageCircle, 
  X, 
  User, 
  Building,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

const ChatInterface = ({ isOpen, onClose, requestId, otherUserId, otherUserName, otherUserRole }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoom, setChatRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    console.log('🔄 ChatInterface: useEffect triggered with:', {
      chatRoom: chatRoom?._id,
      requestId,
      otherUserId,
      isOpen,
      user: user?._id
    });
    
    // If we already have a chat room (e.g., from ChatPage), load messages directly
    if (chatRoom && chatRoom._id) {
      console.log('✅ ChatInterface: Using existing chat room, loading messages');
      loadMessages(chatRoom._id);
      return;
    }
    
    // If we have requestId and otherUserId but no chat room, initialize new chat
    if (isOpen && requestId && user && !chatRoom) {
      console.log('🆕 ChatInterface: Initializing new chat');
      initializeChat();
    }
  }, [isOpen, requestId, otherUserId, user, chatRoom]);

  useEffect(() => {
    if (socket && chatRoom) {
      // Listen for new messages
      socket.on('new_message', handleNewMessage);
      
      // Listen for typing indicators
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      
      // Listen for chat notifications
      socket.on('chat_notification', handleChatNotification);

      return () => {
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('user_stop_typing');
        socket.off('chat_notification');
      };
    }
  }, [socket, chatRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Create or get existing chat room via API
      const result = await apiService.createOrGetChatRoom(requestId, otherUserId);
      const room = result.data;
      setChatRoom(room);
      
      // Load existing messages from API
      await loadMessages(room._id);
      
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to initialize chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      console.log('🔄 ChatInterface: Loading messages for room:', roomId);
      const result = await apiService.getChatMessages(roomId);
      console.log('📨 ChatInterface: API response:', result);
      console.log('📨 ChatInterface: Messages data:', result.data);
      console.log('👤 ChatInterface: Current user:', user);
      console.log('🔍 ChatInterface: Message sender IDs:', result.data?.map(m => m.senderId));
      
      if (result.data && Array.isArray(result.data)) {
        setMessages(result.data);
        console.log('✅ ChatInterface: Messages set successfully, count:', result.data.length);
      } else {
        console.log('⚠️ ChatInterface: No messages data or invalid format');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ ChatInterface: Error loading messages:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    }
  };

  const handleNewMessage = (data) => {
    if (data.roomId === chatRoom?._id) {
      const newMsg = {
        _id: data.messageId,
        roomId: data.roomId,
        senderId: data.senderId,
        content: data.content,
        timestamp: data.timestamp,
        read: false
      };
      
      setMessages(prev => [...prev, newMsg]);
      
      // Mark as read if we're the recipient
      if (data.senderId !== user._id) {
        // mockDataStore.markMessagesAsRead(chatRoom._id, user._id); // Removed MockDataStore
      }
    }
  };

  const handleChatNotification = (data) => {
    console.log('🔔 ChatInterface: Received chat_notification:', data);
    // Show toast notification for new chat message
    if (data.type === 'new_message') {
      console.log('💬 ChatInterface: Showing toast notification for new message');
      toast.success(`${data.title}: ${data.message}`, {
        duration: 5000,
        icon: '💬',
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
      
      // You can also add sound notification here
      // playNotificationSound();
    }
  };

  const handleUserTyping = (data) => {
    if (data.roomId === chatRoom?._id && data.userId !== user._id) {
      setIsTyping(true);
    }
  };

  const handleUserStopTyping = (data) => {
    if (data.roomId === chatRoom?._id && data.userId !== user._id) {
      setIsTyping(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatRoom) return;

    try {
      // Send message through API
      const result = await apiService.sendMessage(chatRoom._id, newMessage.trim());
      const message = result.data;
      
      // Add message to local state
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Emit typing stop
      if (socket) {
        socket.emit('stop_typing', { roomId: chatRoom._id, userId: user._id });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing indicator
    if (socket && chatRoom) {
      socket.emit('typing', { roomId: chatRoom._id, userId: user._id });
      
      // Stop typing indicator after 2 seconds
      setTimeout(() => {
        socket.emit('stop_typing', { roomId: chatRoom._id, userId: user._id });
      }, 2000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting time:', error, timestamp);
      return 'Invalid time';
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return 'Invalid date';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Chat with {otherUserName}
              </h3>
              <p className="text-sm text-gray-500">
                {otherUserRole === 'provider' ? 'Insurance Provider' : 'Client'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            <>
              {console.log('🔍 ChatInterface: Messages state:', messages, 'Count:', messages.length)}
              {messages.map((message, index) => {
                // Determine if message is from current user or other user
                // Handle both string and ObjectId comparisons
                // message.senderId is an object with _id field, not a direct string
                const messageSenderId = message.senderId._id || message.senderId;
                const isOwnMessage = String(messageSenderId) === String(user._id);
                
                // Debug: Log message data
                console.log('💬 Message Debug:', {
                  messageId: message._id,
                  content: message.content,
                  messageSenderId: message.senderId,
                  messageSenderIdType: typeof message.senderId,
                  actualSenderId: messageSenderId,
                  currentUserId: user._id,
                  currentUserIdType: typeof user._id,
                  isOwnMessage,
                  comparison: messageSenderId === user._id,
                  stringComparison: String(messageSenderId) === String(user._id)
                });
                
                // Try to get timestamp from multiple possible fields
                const messageTimestamp = message.timestamp || message.createdAt || message.sentAt || new Date();
                
                const showDate = index === 0 || 
                  formatDate(messageTimestamp) !== formatDate(messages[index - 1]?.timestamp || messages[index - 1]?.createdAt);

                return (
                  <div key={message._id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="text-center text-xs text-gray-400 my-4">
                        {formatDate(messageTimestamp)}
                      </div>
                    )}
                    
                    {/* Message */}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
                      {/* Message bubble */}
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 shadow-sm relative ${
                        isOwnMessage 
                          ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
                          : 'bg-gray-50 text-gray-900 rounded-2xl rounded-bl-sm border border-gray-200'
                      }`}>
                        {/* Message tail for own messages (right side) */}
                        {isOwnMessage && (
                          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-blue-600 transform translate-x-full"></div>
                        )}
                        
                        {/* Message tail for other messages (left side) */}
                        {!isOwnMessage && (
                          <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white transform -translate-x-full"></div>
                        )}
                        
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className={`flex items-center justify-end mt-2 space-x-1 ${
                          isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">{formatTime(messageTimestamp)}</span>
                          {isOwnMessage && (
                            <span className="text-xs ml-2">
                              {message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <span className="text-sm">Typing</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={sendMessage} className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all duration-200"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;


