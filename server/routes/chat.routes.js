const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const ChatRoom = require('../models/ChatRoom.model');
const Message = require('../models/Message.model');
const NotificationService = require('../services/notificationService');

// @route   POST /api/chat/rooms
// @desc    Create or get existing chat room
// @access  Private
router.post('/rooms', protect, async (req, res) => {
  try {
    const { requestId, otherUserId } = req.body;
    
    if (!requestId || !otherUserId) {
      return res.status(400).json({
        message: 'Request ID and other user ID are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Find or create chat room
    const chatRoom = await ChatRoom.findOrCreate(requestId, req.user.id, otherUserId);
    
    // Populate participant details
    await chatRoom.populate('participants', 'profile.firstName profile.lastName profile.companyName');
    
    res.json({
      success: true,
      data: chatRoom
    });
    
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({
      message: 'Server error during chat room creation',
      code: 'CHAT_ROOM_CREATION_ERROR'
    });
  }
});

// @route   GET /api/chat/rooms/:roomId/messages
// @desc    Get messages for a chat room
// @access  Private
router.get('/rooms/:roomId/messages', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    // Verify user is participant in this chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        message: 'Chat room not found',
        code: 'CHAT_ROOM_NOT_FOUND'
      });
    }
    
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({
        message: 'Not authorized to access this chat room',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }
    
    // Build query for messages
    let query = { chatRoomId: roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('senderId', 'profile.firstName profile.lastName profile.companyName')
      .populate('recipientId', 'profile.firstName profile.lastName profile.companyName');
    
    // Mark messages as read for current user
    await Message.markAsReadInRoom(roomId, req.user.id);
    
    // Update unread count
    await chatRoom.markAsRead(req.user.id);

    // Create notification for message sender that their message was read
    try {
      // Get the other participant (the one who sent the messages)
      const otherParticipantId = chatRoom.participants.find(id => id.toString() !== req.user.id);
      
      if (otherParticipantId) {
        await NotificationService.createChatNotification('message_read', {
          recipientId: otherParticipantId,
          senderId: req.user._id,
          chatRoomId: roomId,
          requestId: chatRoom.requestId,
          recipientName: req.user.profile?.firstName || req.user.profile?.companyName || 'User',
          additionalData: {
            roomId: roomId
          }
        });
      }
    } catch (notificationError) {
      console.error('Error creating message read notification:', notificationError);
      // Don't fail the message retrieval if notification fails
    }
    
    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        hasMore: messages.length === Number(limit),
        nextCursor: messages.length > 0 ? messages[messages.length - 1].createdAt : null
      }
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Server error during message retrieval',
      code: 'GET_MESSAGES_ERROR'
    });
  }
});

// @route   POST /api/chat/rooms/:roomId/messages
// @desc    Send a message in a chat room
// @access  Private
router.post('/rooms/:roomId/messages', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text' } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        message: 'Message content is required',
        code: 'MISSING_MESSAGE_CONTENT'
      });
    }
    
    // Verify user is participant in this chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        message: 'Chat room not found',
        code: 'CHAT_ROOM_NOT_FOUND'
      });
    }
    
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({
        message: 'Not authorized to send messages in this chat room',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }
    
    // Get recipient ID (the other participant)
    const recipientId = chatRoom.participants.find(id => id.toString() !== req.user.id);
    
    // Create message
    const message = new Message({
      chatRoomId: roomId,
      senderId: req.user.id,
      recipientId,
      content: content.trim(),
      messageType
    });
    
    await message.save();
    
    // Update chat room last message and unread count
    chatRoom.lastMessage = {
      content: content.trim(),
      senderId: req.user.id,
      timestamp: new Date()
    };
    
        // Increment unread count for recipient
    await chatRoom.incrementUnreadCount(recipientId);
    await chatRoom.save();

    // Create persistent notification for the recipient
    try {
      await NotificationService.createChatNotification('new_message', {
        recipientId: recipientId,
        senderId: req.user._id,
        chatRoomId: roomId,
        requestId: chatRoom.requestId,
        senderName: req.user.profile?.firstName || req.user.profile?.companyName || 'User',
        additionalData: {
          content: content.trim().substring(0, 100), // Truncate long messages
          roomId: roomId
        }
      });
    } catch (notificationError) {
      console.error('❌ Error creating chat notification:', notificationError);
      // Don't fail the message sending if notification fails
    }

    // Populate sender details
    await message.populate('senderId', 'profile.firstName profile.lastName profile.companyName');
    
    // Emit WebSocket notification to recipient
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      // Emit new message event
      io.to(`user_${recipientId}`).emit('new_message', {
        roomId,
        messageId: message._id,
        senderId: req.user.id,
        content: content.trim(),
        timestamp: new Date(),
        senderName: req.user.profile?.firstName || req.user.profile?.companyName || 'User'
      });
      
      // Emit notification event for toast/UI notifications
      io.to(`user_${recipientId}`).emit('chat_notification', {
        type: 'new_message',
        title: 'New Message',
        message: `New message from ${req.user.profile?.firstName || req.user.profile?.companyName || 'User'}`,
        data: {
          roomId,
          messageId: message._id,
          senderId: req.user.id,
          senderName: req.user.profile?.firstName || req.user.profile?.companyName || 'User',
          content: content.trim(),
          timestamp: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      data: message
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Server error during message sending',
      code: 'SEND_MESSAGE_ERROR'
    });
  }
});

// @route   GET /api/chat/rooms/:roomId
// @desc    Get a specific chat room by ID
// @access  Private
router.get('/rooms/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Find the chat room
    const chatRoom = await ChatRoom.findById(roomId)
      .populate('participants', 'profile.firstName profile.lastName profile.companyName role')
      .populate('requestId', 'title description');
    
    if (!chatRoom) {
      return res.status(404).json({
        message: 'Chat room not found',
        code: 'CHAT_ROOM_NOT_FOUND'
      });
    }
    
    // Verify user is participant in this chat room
    if (!chatRoom.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        message: 'Not authorized to access this chat room',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }
    
    res.json({
      success: true,
      data: chatRoom
    });
    
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({
      message: 'Server error during chat room retrieval',
      code: 'GET_CHAT_ROOM_ERROR'
    });
  }
});

// @route   GET /api/chat/rooms
// @desc    Get user's chat rooms
// @access  Private
router.get('/rooms', protect, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    // Get chat rooms where user is participant
    const chatRooms = await ChatRoom.find({
      participants: req.user.id,
      isActive: true
    })
    .populate('participants', 'profile.firstName profile.lastName profile.companyName')
    .populate('requestId', 'title description')
    .sort({ updatedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));
    
    const total = await ChatRoom.countDocuments({
      participants: req.user.id,
      isActive: true
    });
    
    res.json({
      success: true,
      data: chatRooms,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalChats: total
      }
    });
    
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      message: 'Server error during chat rooms retrieval',
      code: 'GET_CHAT_ROOMS_ERROR'
    });
  }
});

// @route   PUT /api/chat/rooms/:roomId/read
// @desc    Mark messages as read in a chat room
// @access  Private
router.put('/rooms/:roomId/read', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Verify user is participant in this chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        message: 'Chat room not found',
        code: 'CHAT_ROOM_NOT_FOUND'
      });
    }
    
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({
        message: 'Not authorized to access this chat room',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }
    
    // Mark messages as read
    await Message.markAsReadInRoom(roomId, req.user.id);
    
    // Update unread count
    await chatRoom.markAsRead(req.user.id);

    // Create notification for message sender that their message was read
    try {
      // Get the other participant (the one who sent the messages)
      const otherParticipantId = chatRoom.participants.find(id => id.toString() !== req.user.id);
      
      if (otherParticipantId) {
        await NotificationService.createChatNotification('message_read', {
          recipientId: otherParticipantId,
          senderId: req.user._id,
          chatRoomId: roomId,
          requestId: chatRoom.requestId,
          recipientName: req.user.profile?.firstName || req.user.profile?.companyName || 'User',
          additionalData: {
            roomId: roomId
          }
        });
      }
    } catch (notificationError) {
      console.error('Error creating message read notification:', notificationError);
      // Don't fail the mark as read operation if notification fails
    }
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      message: 'Server error during mark as read',
      code: 'MARK_AS_READ_ERROR'
    });
  }
});

module.exports = router;
