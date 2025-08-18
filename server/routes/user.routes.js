const express = require('express');
const router = express.Router();
const { protect, authorize, requireOwnership } = require('../middleware/auth.middleware');
const { logAction } = require('../middleware/audit.middleware');
const User = require('../models/User.model');
const InsuranceRequest = require('../models/InsuranceRequest.model');
const Bid = require('../models/Bid.model');
const ChatRoom = require('../models/ChatRoom.model');
const Message = require('../models/Message.model');
const AcceptedOffer = require('../models/AcceptedOffer.model');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, kycStatus, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (role) filter.role = role;
    if (kycStatus) filter.kycStatus = kycStatus;
    if (search) {
      filter.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalUsers: total,
        hasNextPage: skip + users.length < total,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Server error',
      code: 'GET_USERS_ERROR'
    });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -emailVerificationToken -passwordResetToken');
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      message: 'Server error',
      code: 'GET_CURRENT_USER_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/dashboard-stats
// @desc    Get dashboard statistics for a specific user
// @access  Private
router.get('/:userId/dashboard-stats', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the user is requesting their own stats or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s dashboard',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    let totalRequests, openRequests, acceptedRequests, totalBids, pendingBids, acceptedOffersCount = 0;

    if (req.user.role === 'provider') {
      // For providers: count requests they've bid on
      totalRequests = await InsuranceRequest.countDocuments({
        'bids.providerId': userId
      });
      openRequests = await InsuranceRequest.countDocuments({
        'bids.providerId': userId,
        status: 'open'
      });
      acceptedRequests = await InsuranceRequest.countDocuments({
        'bids.providerId': userId,
        status: 'accepted'
      });

      // For providers: count their submitted bids
      totalBids = await InsuranceRequest.countDocuments({
        'bids.providerId': userId
      });
      pendingBids = await InsuranceRequest.countDocuments({
        'bids.providerId': userId,
        'bids': { $elemMatch: { providerId: userId, status: 'pending' } }
      });
      
      // For providers: count offers they've created that have been accepted
      acceptedOffersCount = await AcceptedOffer.countDocuments({
        providerId: userId,
        status: 'active'
      });
    } else {
      // For clients: count requests they've created
      totalRequests = await InsuranceRequest.countDocuments({ clientId: userId });
      openRequests = await InsuranceRequest.countDocuments({
        clientId: userId,
        status: 'open'
      });
      acceptedRequests = await InsuranceRequest.countDocuments({
        clientId: userId,
        status: 'accepted'
      });

      // For clients: count accepted offers from providers
      acceptedOffersCount = await AcceptedOffer.countDocuments({
        clientId: userId,
        status: 'active'
      });

      // For clients: count bids they've received
      // Count bids across all their insurance requests
      const clientRequests = await InsuranceRequest.find({ clientId: userId });
      totalBids = clientRequests.reduce((sum, request) => {
        return sum + (request.bids?.length || 0);
      }, 0);
      
      // Count pending bids across all their requests
      pendingBids = clientRequests.reduce((sum, request) => {
        const pendingBidsInRequest = request.bids?.filter(bid => bid.status === 'pending').length || 0;
        return sum + pendingBidsInRequest;
      }, 0);
    }

    // Get chat count
    const totalChats = await ChatRoom.countDocuments({
      participants: userId
    });

    // Calculate total coverage amount for clients
    let totalCoverage = 0;
    if (req.user.role === 'client') {
      const clientRequests = await InsuranceRequest.find({ clientId: userId });
      console.log('🔍 Dashboard Stats: Found client requests:', clientRequests.length);
      
      totalCoverage = clientRequests.reduce((sum, request) => {
        const requestedAmount = request.insuranceDetails?.requestedAmount || 0;
        console.log('🔍 Dashboard Stats: Request ID:', request._id, 'Title:', request.title, 'Requested Amount:', requestedAmount);
        return sum + requestedAmount;
      }, 0);
      
      console.log('🔍 Dashboard Stats: Total coverage calculated:', totalCoverage);
    }

    // Format stats for frontend
    const stats = {
      // For compatibility with existing frontend
      activeItems: req.user.role === 'provider' ? openRequests : openRequests,
      totalBids: totalBids,
      pendingActions: pendingBids,
      totalCoverage: totalCoverage,
      acceptedOffersCount: acceptedOffersCount || 0, // Use the correct count for accepted offers
      
      // Original fields for backward compatibility
      totalRequests,
      openRequests,
      acceptedRequests,
      pendingBids,
      totalChats
    };

    console.log('🔍 Dashboard Stats: Final stats object:', JSON.stringify(stats, null, 2));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Server error during dashboard stats retrieval',
      code: 'GET_DASHBOARD_STATS_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/insurance-requests
// @desc    Get insurance requests for a specific user
// @access  Private
router.get('/:userId/insurance-requests', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5, page = 1 } = req.query;

    // Verify the user is requesting their own requests or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s requests',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    const requests = await InsuranceRequest.find({ clientId: userId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await InsuranceRequest.countDocuments({ clientId: userId });

    res.json({
      success: true,
      data: requests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRequests: total
      }
    });
  } catch (error) {
    console.error('Get user insurance requests error:', error);
    res.status(500).json({
      message: 'Server error during user requests retrieval',
      code: 'GET_USER_REQUESTS_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/bids
// @desc    Get bids for a specific user
// @access  Private
router.get('/:userId/bids', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5, page = 1 } = req.query;

    // Verify the user is requesting their own bids or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s bids',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    let bids;
    let total;

    if (req.user.role === 'provider') {
      // For providers: get bids they have submitted
      bids = await InsuranceRequest.find({
        'bids.providerId': userId
      })
      .populate('clientId', 'profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

      total = await InsuranceRequest.countDocuments({
        'bids.providerId': userId
      });
    } else {
      // For clients: get bids they have received (existing logic)
      bids = await Bid.find({ clientId: userId })
        .populate('requestId', 'title description')
        .populate('providerId', 'profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      total = await Bid.countDocuments({ clientId: userId });
    }

    res.json({
      success: true,
      data: bids,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalBids: total
      }
    });
  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({
      message: 'Server error during user bids retrieval',
      code: 'GET_USER_BIDS_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/bid-requests
// @desc    Get insurance requests that a provider has bid on
// @access  Private
router.get('/:userId/bid-requests', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5, page = 1 } = req.query;

    // Verify the user is requesting their own bid requests or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s bid requests',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Only providers can access this endpoint
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        message: 'Only providers can access bid requests',
        code: 'INVALID_ROLE'
      });
    }

    // Get requests that the provider has bid on
    const requests = await InsuranceRequest.find({
      'bids.providerId': userId
    })
    .populate('clientId', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

    const total = await InsuranceRequest.countDocuments({
      'bids.providerId': userId
    });

    res.json({
      success: true,
      data: requests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRequests: total
      }
    });
  } catch (error) {
    console.error('Get provider bid requests error:', error);
    res.status(500).json({
      message: 'Server error during provider bid requests retrieval',
      code: 'GET_PROVIDER_BID_REQUESTS_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/chat-rooms
// @desc    Get chat rooms for a specific user
// @access  Private
router.get('/:userId/chat-rooms', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 3, page = 1 } = req.query;

    // Verify the user is requesting their own chats or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s chats',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    const chatRooms = await ChatRoom.find({ participants: userId })
      .populate('participants', 'profile.firstName profile.lastName profile.companyName role')
      .populate('requestId', 'title description')
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await ChatRoom.countDocuments({ participants: userId });

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
    console.error('Get user chat rooms error:', error);
    res.status(500).json({
      message: 'Server error during user chat rooms retrieval',
      code: 'GET_USER_CHAT_ROOMS_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/unread-message-count
// @desc    Get unread message count for a specific user
// @access  Private
router.get('/:userId/unread-message-count', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the user is requesting their own count or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s message count',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    const unreadCount = await Message.countDocuments({
      recipientId: userId,
      read: false
    });

    res.json({
      success: true,
      data: unreadCount
    });
  } catch (error) {
    console.error('Get unread message count error:', error);
    res.status(500).json({
      message: 'Server error during unread count retrieval',
      code: 'GET_UNREAD_COUNT_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/notifications
// @desc    Get notifications for a specific user
// @access  Private
router.get('/:userId/notifications', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5, page = 1 } = req.query;

    // Verify the user is requesting their own notifications or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s notifications',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // For now, return empty array since we don't have a Notification model yet
    // This can be implemented later when we add notifications
    res.json({
      success: true,
      data: [],
      pagination: {
        currentPage: Number(page),
        totalPages: 0,
        totalNotifications: 0
      }
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      message: 'Server error during user notifications retrieval',
      code: 'GET_USER_NOTIFICATIONS_ERROR'
    });
  }
});

// @route   GET /api/users/:userId/active-chats
// @desc    Get active chats for a specific user
// @access  Private
router.get('/:userId/active-chats', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 3, page = 1 } = req.query;

    // Verify the user is requesting their own chats or is an admin
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: 'Not authorized to access this user\'s chats',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Get chat rooms with last message info
    const activeChats = await ChatRoom.find({ participants: userId })
      .populate('participants', 'profile.firstName profile.lastName profile.companyName role')
      .populate('requestId', 'title description')
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await ChatRoom.countDocuments({ participants: userId });

    res.json({
      success: true,
      data: activeChats,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalChats: total
      }
    });
  } catch (error) {
    console.error('Get user active chats error:', error);
    res.status(500).json({
      message: 'Server error during user active chats retrieval',
      code: 'GET_USER_ACTIVE_CHATS_ERROR'
    });
  }
});

// @route   DELETE /api/users/me/data
// @desc    Delete all data for the current user
// @access  Private
router.delete('/me/data', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user's insurance requests
    await InsuranceRequest.deleteMany({ clientId: userId });

    // Delete user's bids
    await Bid.deleteMany({ clientId: userId });

    // Delete user's chat rooms
    await ChatRoom.deleteMany({ participants: userId });

    // Delete user's messages
    await Message.deleteMany({
      $or: [{ senderId: userId }, { recipientId: userId }]
    });

    res.json({
      success: true,
      message: 'All user data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user data error:', error);
    res.status(500).json({
      message: 'Server error during data deletion',
      code: 'DELETE_USER_DATA_ERROR'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        message: 'Not authorized to view this profile',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Server error',
      code: 'GET_USER_ERROR'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, bio, location, preferences } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update profile fields
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (phone !== undefined) user.profile.phone = phone;
    if (bio !== undefined) user.profile.bio = bio;
    if (location !== undefined) user.profile.location = location;
    if (preferences !== undefined) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    // Log profile update
    await logAction('user_updated')(req, res, () => {});

    res.json({
      message: 'Profile updated successfully',
      profile: user.profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error during profile update',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// @route   POST /api/users/kyc
// @desc    Submit KYC documents
// @access  Private (Provider)
router.post('/kyc', protect, authorize('provider'), async (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        message: 'KYC documents are required',
        code: 'KYC_DOCUMENTS_REQUIRED'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add new documents
    user.kycDocuments = [...user.kycDocuments, ...documents];
    user.kycStatus = 'pending';

    await user.save();

    // Log KYC submission
    await logAction('kyc_submitted')(req, res, () => {});

    res.json({
      message: 'KYC documents submitted successfully',
      kycStatus: user.kycStatus,
      documents: user.kycDocuments
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      message: 'Server error during KYC submission',
      code: 'KYC_SUBMISSION_ERROR'
    });
  }
});

// @route   PUT /api/users/kyc/:userId
// @desc    Update KYC status (admin only)
// @access  Private (Admin)
router.put('/kyc/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, verifiedBy } = req.body;
    const { userId } = req.params;

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid KYC status',
        code: 'INVALID_KYC_STATUS'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.role !== 'provider') {
      return res.status(400).json({
        message: 'Only providers can have KYC status',
        code: 'INVALID_USER_ROLE'
      });
    }

    user.kycStatus = status;
    if (status === 'verified') {
      user.kycDocuments.forEach(doc => {
        if (!doc.verifiedAt) {
          doc.verifiedAt = new Date();
          doc.verifiedBy = verifiedBy || req.user.id;
        }
      });
    }

    await user.save();

    // Log KYC status change
    await logAction('kyc_status_updated')(req, res, () => {});

    res.json({
      message: 'KYC status updated successfully',
      kycStatus: user.kycStatus
    });
  } catch (error) {
    console.error('KYC status update error:', error);
    res.status(500).json({
      message: 'Server error during KYC status update',
      code: 'KYC_STATUS_UPDATE_ERROR'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (admin only)
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const { id } = req.params;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be a boolean',
        code: 'INVALID_STATUS_VALUE'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    user.isActive = isActive;
    await user.save();

    // Log status change
    await logAction('user_status_updated')(req, res, () => {});

    res.json({
      message: 'User status updated successfully',
      isActive: user.isActive
    });
  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({
      message: 'Server error during status update',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Soft delete - just deactivate the user
    user.isActive = false;
    await user.save();

    // Log user deactivation
    await logAction('user_deactivated')(req, res, () => {});

    res.json({
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({
      message: 'Server error during user deletion',
      code: 'USER_DELETION_ERROR'
    });
  }
});

module.exports = router;



