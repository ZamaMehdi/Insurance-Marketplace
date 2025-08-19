import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ChatInterface from '../components/ChatInterface';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [chatRoom, setChatRoom] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatId && user) {
      loadChatRoom();
    }
  }, [chatId, user]);

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      
      // Get chat room details using apiService
      const result = await apiService.getChatRoom(chatId);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to load chat room data');
      }
      
      const room = result.data;
      setChatRoom(room);
      
      // Find the other participant
      const userId = user?._id || user?.user?._id;
      const otherParticipant = room.participants?.find(p => p._id !== userId);
      setOtherUser(otherParticipant);
      

      
    } catch (error) {
      console.error('Error loading chat room:', error);
      toast.error('Failed to load chat room');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!chatRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Chat room not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Chat with {otherUser?.profile?.firstName || otherUser?.profile?.companyName || 'User'}
                </h1>
                {chatRoom.requestId && (
                  <p className="text-sm text-gray-500">
                    Re: {chatRoom.requestId.title}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ChatInterface
          isOpen={true}
          onClose={() => navigate('/dashboard')}
          chatRoom={chatRoom}
          requestId={chatRoom.requestId?._id || chatRoom.requestId}
          otherUserId={otherUser?._id}
          otherUserName={otherUser?.profile?.firstName || otherUser?.profile?.companyName || 'User'}
          otherUserRole={otherUser?.role}
        />
      </div>
    </div>
  );
};

export default ChatPage;
