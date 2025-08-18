const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'system'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ chatRoomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ recipientId: 1, read: 1 });
messageSchema.index({ createdAt: -1 });

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to edit message
messageSchema.methods.edit = function(newContent) {
  this.content = newContent;
  this.edited = true;
  this.editedAt = new Date();
  return this.save();
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipientId: userId,
    read: false
  });
};

// Static method to mark messages as read in a chat room
messageSchema.statics.markAsReadInRoom = function(chatRoomId, userId) {
  return this.updateMany(
    {
      chatRoomId,
      recipientId: userId,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );
};

// Pre-save middleware to update chat room's last message
messageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const ChatRoom = mongoose.model('ChatRoom');
      await ChatRoom.findByIdAndUpdate(this.chatRoomId, {
        lastMessage: {
          content: this.content,
          senderId: this.senderId,
          timestamp: this.createdAt || new Date()
        },
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating chat room last message:', error);
    }
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;


