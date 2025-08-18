const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Bid related
      'bid_received',
      'bid_accepted',
      'bid_rejected',
      'bid_withdrawn',
      
      // Offer related
      'offer_accepted',
      'offer_rejected',
      'offer_expired',
      
      // Request related
      'request_bid_submitted',
      'request_status_changed',
      'request_deadline_approaching',
      
      // Chat related
      'new_message',
      'message_read',
      
      // System related
      'kyc_approved',
      'kyc_rejected',
      'account_verified',
      'payment_received',
      'payment_failed',
      
      // General
      'welcome',
      'reminder',
      'update'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['bid', 'offer', 'request', 'chat', 'system', 'payment'],
    required: true
  },
  actionUrl: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ recipientId: 1, category: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.read = false;
  this.readAt = null;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = function(data) {
  return this.create({
    recipientId: data.recipientId,
    senderId: data.senderId,
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.data || {},
    priority: data.priority || 'medium',
    category: data.category,
    actionUrl: data.actionUrl,
    expiresAt: data.expiresAt
  });
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipientId: userId,
    read: false,
    isDeleted: false
  });
};

// Static method to mark all notifications as read for user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipientId: userId,
      read: false,
      isDeleted: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );
};

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    category,
    read,
    type
  } = options;

  const filter = {
    recipientId: userId,
    isDeleted: false
  };

  if (category) filter.category = category;
  if (read !== undefined) filter.read = read;
  if (type) filter.type = type;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('senderId', 'profile.firstName profile.lastName profile.companyName email');
};

// Virtual for time since creation
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Ensure virtuals are included when converting to JSON
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
