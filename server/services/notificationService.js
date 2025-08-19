const Notification = require('../models/Notification.model');

// Service class for handling all notification-related operations
// This centralizes the notification logic and makes it easier to maintain
class NotificationService {
  /**
   * Create a new notification
   * This is the base method that other notification types use
   */
  static async createNotification(data) {
    try {
      const notification = await Notification.createNotification(data);
      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create bid-related notifications
   * Handles all the different types of bid notifications (received, accepted, rejected, etc.)
   */
  static async createBidNotification(type, data) {
    // Build the base notification data structure
    const notificationData = {
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: type,
      category: 'bid',
      data: {
        requestId: data.requestId,
        bidId: data.bidId,
        amount: data.amount,
        ...data.additionalData
      }
    };

    // Handle different bid notification types
    // Each type has different messaging and priority levels
    switch (type) {
      case 'bid_received':
        notificationData.title = 'New Bid Received';
        notificationData.message = `You received a new bid of $${data.amount} on your insurance request.`;
        notificationData.priority = 'high';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      case 'bid_accepted':
        notificationData.title = 'Bid Accepted!';
        notificationData.message = `Your bid of $${data.amount} has been accepted by the client.`;
        notificationData.priority = 'urgent';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      case 'bid_rejected':
        notificationData.title = 'Bid Status Update';
        notificationData.message = `Your bid of $${data.amount} was not selected for this request.`;
        notificationData.priority = 'medium';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      case 'bid_withdrawn':
        notificationData.title = 'Bid Withdrawn';
        notificationData.message = `A provider has withdrawn their bid from your request.`;
        notificationData.priority = 'medium';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      default:
        throw new Error(`Unknown bid notification type: ${type}`);
    }

    return this.createNotification(notificationData);
  }

  /**
   * Create offer-related notifications
   */
  static async createOfferNotification(type, data) {
    const notificationData = {
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: type,
      category: 'offer',
      data: {
        offerId: data.offerId,
        ...data.additionalData
      }
    };

    switch (type) {
      case 'offer_accepted':
        notificationData.title = 'Offer Accepted!';
        notificationData.message = `A client has accepted your insurance offer "${data.offerTitle}".`;
        notificationData.priority = 'urgent';
        notificationData.actionUrl = `/posted-offers`;
        break;

      case 'offer_rejected':
        notificationData.title = 'Offer Status Update';
        notificationData.message = `A client has declined your insurance offer "${data.offerTitle}".`;
        notificationData.priority = 'medium';
        notificationData.actionUrl = `/posted-offers`;
        break;

      case 'offer_expired':
        notificationData.title = 'Offer Expired';
        notificationData.message = `Your insurance offer "${data.offerTitle}" has expired.`;
        notificationData.priority = 'low';
        notificationData.actionUrl = `/posted-offers`;
        break;

      default:
        throw new Error(`Unknown offer notification type: ${type}`);
    }

    return this.createNotification(notificationData);
  }

  /**
   * Create request-related notifications
   */
  static async createRequestNotification(type, data) {
    const notificationData = {
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: type,
      category: 'request',
      data: {
        requestId: data.requestId,
        ...data.additionalData
      }
    };

    switch (type) {
      case 'request_bid_submitted':
        notificationData.title = 'New Bid Submitted';
        notificationData.message = `A provider has submitted a bid on your insurance request "${data.requestTitle}".`;
        notificationData.priority = 'high';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      case 'request_status_changed':
        notificationData.title = 'Request Status Updated';
        notificationData.message = `Your insurance request "${data.requestTitle}" status has changed to ${data.newStatus}.`;
        notificationData.priority = 'medium';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      case 'request_deadline_approaching':
        notificationData.title = 'Bidding Deadline Approaching';
        notificationData.message = `Your insurance request "${data.requestTitle}" bidding deadline is approaching.`;
        notificationData.priority = 'high';
        notificationData.actionUrl = `/request-detail/${data.requestId}`;
        break;

      default:
        throw new Error(`Unknown request notification type: ${type}`);
    }

    return this.createNotification(notificationData);
  }

  /**
   * Create chat-related notifications
   */
  static async createChatNotification(type, data) {
    const notificationData = {
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: type,
      category: 'chat',
      data: {
        chatRoomId: data.chatRoomId,
        requestId: data.requestId,
        ...data.additionalData
      }
    };

    switch (type) {
      case 'new_message':
        notificationData.title = 'New Message';
        notificationData.message = `You have a new message from ${data.senderName}.`;
        notificationData.priority = 'medium';
        notificationData.actionUrl = `/chat/${data.chatRoomId}`;
        break;

      case 'message_read':
        notificationData.title = 'Message Read';
        notificationData.message = `${data.recipientName} has read your message.`;
        notificationData.priority = 'low';
        notificationData.actionUrl = `/chat/${data.chatRoomId}`;
        break;

      default:
        throw new Error(`Unknown chat notification type: ${type}`);
    }

    return this.createNotification(notificationData);
  }

  /**
   * Create system notifications
   */
  static async createSystemNotification(type, data) {
    const notificationData = {
      recipientId: data.recipientId,
      type: type,
      category: 'system',
      data: data.additionalData || {}
    };

    switch (type) {
      case 'kyc_approved':
        notificationData.title = 'KYC Verification Approved';
        notificationData.message = 'Your KYC verification has been approved. You can now post insurance offers.';
        notificationData.priority = 'high';
        notificationData.actionUrl = '/post-insurance-offer';
        break;

      case 'kyc_rejected':
        notificationData.title = 'KYC Verification Update';
        notificationData.message = 'Your KYC verification requires additional information. Please check your email.';
        notificationData.priority = 'high';
        notificationData.actionUrl = '/dashboard';
        break;

      case 'account_verified':
        notificationData.title = 'Account Verified';
        notificationData.message = 'Your account has been successfully verified. Welcome to the platform!';
        notificationData.priority = 'medium';
        notificationData.actionUrl = '/dashboard';
        break;

      case 'welcome':
        notificationData.title = 'Welcome to Insurance Marketplace!';
        notificationData.message = 'Thank you for joining. Start exploring insurance offers or create your first request.';
        notificationData.priority = 'low';
        notificationData.actionUrl = '/dashboard';
        break;

      default:
        throw new Error(`Unknown system notification type: ${type}`);
    }

    return this.createNotification(notificationData);
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const notifications = await Notification.getUserNotifications(userId, options);
      const total = await Notification.countDocuments({
        recipientId: userId,
        isDeleted: false
      });

      return {
        notifications,
        pagination: {
          currentPage: options.page || 1,
          totalPages: Math.ceil(total / (options.limit || 20)),
          totalNotifications: total,
          hasNextPage: (options.page || 1) * (options.limit || 20) < total,
          hasPrevPage: (options.page || 1) > 1
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      if (notification.recipientId.toString() !== userId.toString()) {
        throw new Error('Not authorized to modify this notification');
      }
      return await notification.markAsRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      return await Notification.markAllAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Delete a notification (soft delete)
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      if (notification.recipientId.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this notification');
      }
      
      notification.isDeleted = true;
      return await notification.save();
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
