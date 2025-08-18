const express = require('express');
const router = express.Router();
const AcceptedOffer = require('../models/AcceptedOffer.model');
const { protect } = require('../middleware/auth.middleware');
const NotificationService = require('../services/notificationService');

// @route   POST /api/accepted-offers
// @desc    Create a new accepted offer
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      offerId, 
      clientId, 
      providerId, 
      coverageAmount, 
      startDate, 
      monthlyPremium, 
      additionalNotes 
    } = req.body;

    // Validate required fields
    if (!offerId || !clientId || !providerId || !coverageAmount || !startDate || !monthlyPremium) {
      return res.status(400).json({
        message: 'Missing required fields',
        code: 'MISSING_FIELDS'
      });
    }

    // Create the accepted offer
    const acceptedOffer = new AcceptedOffer({
      offerId,
      clientId,
      providerId,
      coverageAmount,
      startDate: new Date(startDate),
      monthlyPremium,
      additionalNotes: additionalNotes || ''
    });

    await acceptedOffer.save();

    // Create persistent notification for the provider
    try {
      await NotificationService.createOfferNotification('offer_accepted', {
        recipientId: providerId,
        senderId: clientId,
        offerId: offerId,
        offerTitle: 'Insurance Offer', // You might want to populate this from the offer
        additionalData: {
          coverageAmount,
          monthlyPremium,
          clientName: req.user.profile?.firstName || req.user.profile?.lastName || 'Client'
        }
      });
    } catch (notificationError) {
      console.error('Error creating offer acceptance notification:', notificationError);
      // Don't fail the offer acceptance if notification fails
    }

    // Populate references for response
    await acceptedOffer.populate([
      { path: 'clientId', select: 'profile.firstName profile.lastName email' },
      { path: 'providerId', select: 'profile.firstName profile.lastName profile.companyName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Accepted offer created successfully',
      data: acceptedOffer
    });

  } catch (error) {
    console.error('Create accepted offer error:', error);
    res.status(500).json({
      message: 'Server error during accepted offer creation',
      code: 'CREATE_OFFER_ERROR'
    });
  }
});

// @route   GET /api/accepted-offers/client/:clientId
// @desc    Get accepted offers for a specific client
// @access  Private (Client can only see their own offers)
router.get('/client/:clientId', protect, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10, page = 1, status } = req.query;

    // Check if user is requesting their own offers
    if (req.user.id !== clientId) {
      return res.status(403).json({
        message: 'Not authorized to view these offers',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Build query
    const query = { clientId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get accepted offers with pagination
    const acceptedOffers = await AcceptedOffer.find(query)
      .populate('offerId', 'title category')
      .populate('clientId', 'profile.firstName profile.lastName email')
      .populate('providerId', 'profile.firstName profile.lastName profile.companyName email')
      .sort({ acceptedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await AcceptedOffer.countDocuments(query);

    res.json({
      success: true,
      data: acceptedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get client accepted offers error:', error);
    res.status(500).json({
      message: 'Server error during accepted offers retrieval',
      code: 'GET_OFFERS_ERROR'
    });
  }
});

// @route   GET /api/accepted-offers/provider/:providerId
// @desc    Get accepted offers for a specific provider
// @access  Private (Provider can only see their own offers)
router.get('/provider/:providerId', protect, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { limit = 10, page = 1, status } = req.query;

    // Check if user is requesting their own offers
    if (req.user.id !== providerId) {
      return res.status(403).json({
        message: 'Not authorized to view these offers',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Build query
    const query = { providerId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get accepted offers with pagination
    const acceptedOffers = await AcceptedOffer.find(query)
      .populate('clientId', 'profile.firstName profile.lastName email')
      .populate('providerId', 'profile.firstName profile.lastName profile.companyName email')
      .sort({ acceptedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await AcceptedOffer.countDocuments(query);

    res.json({
      success: true,
      data: acceptedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get provider accepted offers error:', error);
    res.status(500).json({
      message: 'Server error during accepted offers retrieval',
      code: 'GET_OFFERS_ERROR'
    });
  }
});

// @route   PUT /api/accepted-offers/:id/status
// @desc    Update accepted offer status
// @access  Private (Owner can only update their own offers)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: 'Status is required',
        code: 'MISSING_STATUS'
      });
    }

    const acceptedOffer = await AcceptedOffer.findById(id);
    if (!acceptedOffer) {
      return res.status(404).json({
        message: 'Accepted offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    // Check ownership (client can update their accepted offers)
    if (acceptedOffer.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not authorized to update this offer',
        code: 'UNAUTHORIZED_UPDATE'
      });
    }

    // Update status and add timestamp
    acceptedOffer.status = status;
    if (status === 'cancelled') {
      acceptedOffer.cancelledAt = new Date();
    } else if (status === 'completed') {
      acceptedOffer.completedAt = new Date();
    }

    await acceptedOffer.save();

    res.json({
      success: true,
      message: 'Accepted offer status updated successfully',
      data: acceptedOffer
    });

  } catch (error) {
    console.error('Update accepted offer status error:', error);
    res.status(500).json({
      message: 'Server error during status update',
      code: 'UPDATE_STATUS_ERROR'
    });
  }
});

module.exports = router;


