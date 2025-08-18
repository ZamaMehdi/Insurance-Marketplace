const express = require('express');
const router = express.Router();
const { protect, requireVerifiedProvider } = require('../middleware/auth.middleware');
const InsuranceRequest = require('../models/InsuranceRequest.model');
const NotificationService = require('../services/notificationService');

// @route   POST /api/bids
// @desc    Submit a bid on an insurance request
// @access  Private (Provider)
router.post('/', protect, async (req, res) => {
  try {
    const {
      requestId,
      amount,
      percentage,
      premium,
      terms,
      conditions
    } = req.body;

    // Validate required fields
    if (!requestId || !amount || !percentage || !premium) {
      return res.status(400).json({
        message: 'Missing required bid details',
        code: 'MISSING_BID_DETAILS'
      });
    }

    // Find the insurance request
    const request = await InsuranceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Check if bidding is still open
    if (request.status !== 'open' && request.status !== 'bidding') {
      return res.status(400).json({
        message: 'Bidding is not open for this request',
        code: 'BIDDING_CLOSED'
      });
    }

    // Check if deadline has passed
    if (new Date() > new Date(request.biddingDetails.deadline)) {
      return res.status(400).json({
        message: 'Bidding deadline has passed',
        code: 'DEADLINE_PASSED'
      });
    }

    // Check if provider has already bid
    const existingBid = request.bids.find(bid => 
      bid.providerId.toString() === req.user.id
    );
    if (existingBid) {
      return res.status(400).json({
        message: 'You have already submitted a bid for this request',
        code: 'ALREADY_BID'
      });
    }

    // Validate bid amount
    if (amount > request.insuranceDetails.requestedAmount) {
      return res.status(400).json({
        message: 'Bid amount cannot exceed requested amount',
        code: 'INVALID_BID_AMOUNT'
      });
    }

    // Validate percentage
    if (percentage < request.biddingDetails.minimumBidPercentage) {
      return res.status(400).json({
        message: `Bid percentage must be at least ${request.biddingDetails.minimumBidPercentage}%`,
        code: 'INVALID_BID_PERCENTAGE'
      });
    }

    // Create new bid
    const newBid = {
      providerId: req.user.id,
      amount,
      percentage,
      premium,
      terms,
      conditions: conditions || [],
      status: 'pending',
      submittedAt: new Date()
    };

    // Add bid to request
    request.bids.push(newBid);
    request.bidCount = request.bids.length;
    
    // Update status to bidding if this is the first bid
    if (request.status === 'open') {
      request.status = 'bidding';
    }

    await request.save();

    // Create persistent notification for the client
    try {
      await NotificationService.createRequestNotification('request_bid_submitted', {
        recipientId: request.clientId,
        senderId: req.user._id,
        requestId: request._id,
        requestTitle: request.title,
        additionalData: {
          bidAmount: amount,
          bidPercentage: percentage,
          providerName: req.user.profile?.companyName || req.user.profile?.firstName || 'Insurance Provider'
        }
      });
    } catch (notificationError) {
      console.error('Error creating bid notification:', notificationError);
      // Don't fail the bid submission if notification fails
    }

    // Emit WebSocket notification to the client
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`user_${request.clientId}`).emit('new_bid_notification', {
        type: 'new_bid',
        requestId: request._id,
        requestTitle: request.title,
        providerId: req.user.id,
        providerName: req.user.profile?.companyName || req.user.profile?.firstName || 'Insurance Provider',
        bidAmount: amount,
        bidPercentage: percentage,
        message: `New bid received on "${request.title}" - $${amount.toLocaleString()} (${percentage}%)`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      bid: newBid,
      request: request
    });
    
  } catch (error) {
    console.error('Submit bid error:', error);
    res.status(500).json({
      message: 'Server error during bid submission',
      code: 'SUBMIT_BID_ERROR'
    });
  }
});

// @route   GET /api/bids/request/:requestId
// @desc    Get all bids for a specific insurance request
// @access  Private
router.get('/request/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Find the insurance request and populate bid details
    const request = await InsuranceRequest.findById(requestId)
      .populate('bids.providerId', 'profile.companyName profile.firstName profile.lastName profile.avgRating');
    
    if (!request) {
      return res.status(404).json({
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }
    
    // Return the bids with success format
    res.json({
      success: true,
      data: request.bids || [],
      pagination: {
        totalBids: request.bids ? request.bids.length : 0,
        currentPage: 1,
        totalPages: 1
      }
    });
    
  } catch (error) {
    console.error('Get bids for request error:', error);
    res.status(500).json({
      message: 'Server error during bids retrieval',
      code: 'GET_BIDS_ERROR'
    });
  }
});

// @route   PUT /api/bids/:bidId/reject
// @desc    Reject a bid on an insurance request
// @access  Private (Owner Client)
router.put('/:bidId/reject', protect, async (req, res) => {
  try {
    const { bidId } = req.params;
    
    // Find the insurance request that contains this bid
    const request = await InsuranceRequest.findOne({
      'bids._id': bidId
    }).populate('bids.providerId', 'profile.companyName profile.firstName profile.lastName');
    
    if (!request) {
      return res.status(404).json({
        message: 'Bid not found',
        code: 'BID_NOT_FOUND'
      });
    }
    
    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not authorized to reject this bid',
        code: 'UNAUTHORIZED_ACTION'
      });
    }
    
    // Find the specific bid
    const bid = request.bids.id(bidId);
    if (!bid) {
      return res.status(404).json({
        message: 'Bid not found',
        code: 'BID_NOT_FOUND'
      });
    }
    
    // Update bid status
    bid.status = 'rejected';
    bid.responseAt = new Date();
    
        await request.save();

    // Create persistent notification for the provider
    try {
      await NotificationService.createBidNotification('bid_rejected', {
        recipientId: bid.providerId,
        senderId: req.user._id,
        requestId: request._id,
        bidId: bid._id,
        amount: bid.amount,
        additionalData: {
          requestTitle: request.title,
          clientName: req.user.profile?.firstName || req.user.profile?.lastName || 'Client'
        }
      });
    } catch (notificationError) {
      console.error('Error creating bid rejection notification:', notificationError);
      // Don't fail the bid rejection if notification fails
    }

    // Emit WebSocket notification to the provider
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`user_${bid.providerId}`).emit('bid_rejected_notification', {
        type: 'bid_rejected',
        requestId: request._id,
        requestTitle: request.title,
        bidId: bid._id,
        message: `Your bid on "${request.title}" was rejected by the client`
      });
    }
    
    res.json({
      success: true,
      message: 'Bid rejected successfully',
      bid: bid,
      request: request
    });
    
  } catch (error) {
    console.error('Reject bid error:', error);
    res.status(500).json({
      message: 'Server error during bid rejection',
      code: 'REJECT_BID_ERROR'
    });
  }
});

// @route   PUT /api/bids/:bidId/accept
// @desc    Accept a bid on an insurance request
// @access  Private (Owner Client)
router.put('/:bidId/accept', protect, async (req, res) => {
  try {
    const { bidId } = req.params;
    
    // Find the insurance request that contains this bid
    const request = await InsuranceRequest.findOne({
      'bids._id': bidId
    }).populate('bids.providerId', 'profile.companyName profile.firstName profile.lastName');
    
    if (!request) {
      return res.status(404).json({
        message: 'Bid not found',
        code: 'BID_NOT_FOUND'
      });
    }
    
    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not authorized to accept this bid',
        code: 'UNAUTHORIZED_ACTION'
      });
    }
    
    // Find the specific bid
    const bid = request.bids.id(bidId);
    if (!bid) {
      return res.status(404).json({
        message: 'Bid not found',
        code: 'BID_NOT_FOUND'
      });
    }
    
    // Update bid status
    bid.status = 'accepted';
    bid.responseAt = new Date();
    
    // Add to awarded bids
    request.awardedBids.push({
      bidId: bid._id,
      providerId: bid.providerId,
      amount: bid.amount,
      percentage: bid.percentage,
      premium: bid.premium
    });
    
    // Update totals
    request.totalAwardedAmount += bid.amount;
    request.totalAwardedPercentage += bid.percentage;
    
    // Check if fully covered
    if (request.totalAwardedPercentage >= 100) {
      request.isFullyCovered = true;
      request.status = 'awarded';
    }
    
    await request.save();

    // Create persistent notification for the provider
    try {
      await NotificationService.createBidNotification('bid_accepted', {
        recipientId: bid.providerId,
        senderId: req.user._id,
        requestId: request._id,
        bidId: bid._id,
        amount: bid.amount,
        additionalData: {
          requestTitle: request.title,
          clientName: req.user.profile?.firstName || req.user.profile?.lastName || 'Client',
          bidPercentage: bid.percentage
        }
      });
    } catch (notificationError) {
      console.error('Error creating bid acceptance notification:', notificationError);
      // Don't fail the bid acceptance if notification fails
    }

    // Emit WebSocket notification to the provider
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`user_${bid.providerId._id}`).emit('bid_accepted_notification', {
        type: 'bid_accepted',
        requestId: request._id,
        requestTitle: request.title,
        clientId: req.user.id,
        clientName: req.user.profile?.firstName || req.user.profile?.lastName || 'Client',
        bidAmount: bid.amount,
        bidPercentage: bid.percentage,
        message: `Your bid on "${request.title}" has been accepted! - $${bid.amount.toLocaleString()} (${bid.percentage}%)`
      });
    }
    
    res.json({
      success: true,
      message: 'Bid accepted successfully',
      bid: bid,
      request: request
    });
    
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({
      message: 'Server error during bid acceptance',
      code: 'ACCEPT_BID_ERROR'
    });
  }
});

// Placeholder for other bid routes
router.get('/', (req, res) => {
  res.json({ message: 'Bid routes coming soon' });
});

module.exports = router;



