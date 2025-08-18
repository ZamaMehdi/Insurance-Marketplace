const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { logAction } = require('../middleware/audit.middleware');
const NotificationService = require('../services/notificationService');

// @route   GET /api/notifications
// @desc    Get user's notifications with pagination and filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, read, type } = req.query;
    
    const result = await NotificationService.getUserNotifications(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type
    });

    res.json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Failed to load notifications',
      code: 'GET_NOTIFICATIONS_ERROR'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get user's unread notification count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: 'Failed to load unread count',
      code: 'GET_UNREAD_COUNT_ERROR'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
    
    // Log the action
    await logAction({
      userId: req.user._id,
      action: 'notification_read',
      details: { notificationId: req.params.id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      resourceType: 'notification',
      resourceId: req.params.id
    });

    res.json({ 
      message: 'Notification marked as read',
      notification 
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.message === 'Notification not found') {
      return res.status(404).json({ 
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }
    if (error.message === 'Not authorized to modify this notification') {
      return res.status(403).json({ 
        message: 'Not authorized to modify this notification',
        code: 'NOT_AUTHORIZED'
      });
    }
    res.status(500).json({ 
      message: 'Failed to mark notification as read',
      code: 'MARK_READ_ERROR'
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all user's notifications as read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user._id);
    
    // Log the action
    await logAction({
      userId: req.user._id,
      action: 'all_notifications_read',
      details: { count: result.modifiedCount },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      resourceType: 'notification'
    });

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ 
      message: 'Failed to mark all notifications as read',
      code: 'MARK_ALL_READ_ERROR'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification (soft delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await NotificationService.deleteNotification(req.params.id, req.user._id);
    
    // Log the action
    await logAction({
      userId: req.user._id,
      action: 'notification_deleted',
      details: { notificationId: req.params.id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      resourceType: 'notification',
      resourceId: req.params.id
    });

    res.json({ 
      message: 'Notification deleted successfully',
      notification 
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.message === 'Notification not found') {
      return res.status(404).json({ 
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }
    if (error.message === 'Not authorized to delete this notification') {
      return res.status(403).json({ 
        message: 'Not authorized to delete this notification',
        code: 'NOT_AUTHORIZED'
      });
    }
    res.status(500).json({ 
      message: 'Failed to delete notification',
      code: 'DELETE_NOTIFICATION_ERROR'
    });
  }
});

// @route   GET /api/notifications/categories
// @desc    Get notification categories with counts
// @access  Private
router.get('/categories', protect, async (req, res) => {
  try {
    const { Notification } = require('../models/Notification.model');
    
    const categories = await Notification.aggregate([
      {
        $match: {
          recipientId: req.user._id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: ['$read', 0, 1]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({ categories });
  } catch (error) {
    console.error('Get notification categories error:', error);
    res.status(500).json({ 
      message: 'Failed to load notification categories',
      code: 'GET_CATEGORIES_ERROR'
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Create a test notification (for development/testing)
// @access  Private
router.post('/test', protect, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        message: 'Test notifications not allowed in production',
        code: 'TEST_NOT_ALLOWED'
      });
    }

    const { type, category } = req.body;
    
    let notification;
    switch (category) {
      case 'bid':
        notification = await NotificationService.createBidNotification(type, {
          recipientId: req.user._id,
          senderId: req.user._id,
          requestId: '507f1f77bcf86cd799439011', // Test ID
          bidId: '507f1f77bcf86cd799439012', // Test ID
          amount: 1000,
          additionalData: { test: true }
        });
        break;
        
      case 'offer':
        notification = await NotificationService.createOfferNotification(type, {
          recipientId: req.user._id,
          senderId: req.user._id,
          offerId: '507f1f77bcf86cd799439013', // Test ID
          offerTitle: 'Test Insurance Offer',
          additionalData: { test: true }
        });
        break;
        
      case 'system':
        notification = await NotificationService.createSystemNotification(type, {
          recipientId: req.user._id,
          additionalData: { test: true }
        });
        break;
        
      default:
        return res.status(400).json({ 
          message: 'Invalid category',
          code: 'INVALID_CATEGORY'
        });
    }

    res.json({ 
      message: 'Test notification created successfully',
      notification 
    });
  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({ 
      message: 'Failed to create test notification',
      code: 'CREATE_TEST_NOTIFICATION_ERROR'
    });
  }
});

module.exports = router;
