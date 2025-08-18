const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsuranceRequest',
    required: true
  },
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ requestId: 1 });
chatRoomSchema.index({ updatedAt: -1 });

// Method to mark messages as read for a specific user
chatRoomSchema.methods.markAsRead = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Method to increment unread count for a specific user
chatRoomSchema.methods.incrementUnreadCount = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Method to get unread count for a specific user
chatRoomSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Static method to find or create chat room
chatRoomSchema.statics.findOrCreate = async function(requestId, clientId, providerId) {
  let chatRoom = await this.findOne({
    requestId,
    participants: { $all: [clientId, providerId] }
  });

  if (!chatRoom) {
    chatRoom = new this({
      participants: [clientId, providerId],
      requestId,
      unreadCount: new Map([
        [clientId.toString(), 0],
        [providerId.toString(), 0]
      ])
    });
    await chatRoom.save();
  }

  return chatRoom;
};

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;



