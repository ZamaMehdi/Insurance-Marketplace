const express = require('express');
const router = express.Router();
const { protect, authorize, requireVerifiedProvider } = require('../middleware/auth.middleware');
const { logAction } = require('../middleware/audit.middleware');
const InsuranceOffer = require('../models/InsuranceOffer.model');
const AcceptedOffer = require('../models/AcceptedOffer.model');

// @route   POST /api/offers/accept
// @desc    Accept an insurance offer (Client only)
// @access  Private (Client)
router.post('/accept', protect, authorize('client'), async (req, res) => {
  try {
    const { offerId, coverageAmount, startDate, additionalNotes } = req.body;

    // Validate required fields
    if (!offerId || !coverageAmount || !startDate) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Find the offer
    const offer = await InsuranceOffer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ 
        message: 'Insurance offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    // Check if offer is still active
    if (offer.status !== 'active') {
      return res.status(400).json({ 
        message: 'This offer is no longer active',
        code: 'OFFER_INACTIVE'
      });
    }

    // Validate coverage amount
    if (coverageAmount < offer.coverageDetails.minAmount || coverageAmount > offer.coverageDetails.maxAmount) {
      return res.status(400).json({ 
        message: `Coverage amount must be between $${offer.coverageDetails.minAmount.toLocaleString()} and $${offer.coverageDetails.maxAmount.toLocaleString()}`,
        code: 'INVALID_COVERAGE_AMOUNT'
      });
    }

    // Create accepted offer record
    const acceptedOffer = new AcceptedOffer({
      offerId: offer._id,
      clientId: req.user.id,
      providerId: offer.providerId,
      coverageAmount,
      startDate: new Date(startDate),
      monthlyPremium: offer.pricing.basePremium,
      additionalNotes: additionalNotes || '',
      status: 'active'
    });

    await acceptedOffer.save();

    // Log offer acceptance
    await logAction('insurance_offer_accepted')(req, res, () => {});

    res.status(201).json({
      message: 'Insurance offer accepted successfully',
      acceptedOffer
    });
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ 
      message: 'Server error during offer acceptance',
      code: 'ACCEPT_OFFER_ERROR'
    });
  }
});

// @route   GET /api/offers/accepted
// @desc    Get client's accepted offers
// @access  Private (Client)
router.get('/accepted', protect, authorize('client'), async (req, res) => {
  try {
    const acceptedOffers = await AcceptedOffer.find({ clientId: req.user.id })
      .populate('offerId', 'title category description')
      .populate('providerId', 'profile.companyName profile.firstName profile.lastName')
      .sort({ acceptedAt: -1 });

    res.json({
      acceptedOffers
    });
  } catch (error) {
    console.error('Get accepted offers error:', error);
    res.status(500).json({ 
      message: 'Server error during accepted offers retrieval',
      code: 'GET_ACCEPTED_OFFERS_ERROR'
    });
  }
});

// @route   GET /api/offers
// @desc    Get insurance offers with filters (public offers)
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Main offers endpoint called');
    console.log('🔍 Query params:', req.query);
    
    const { 
      category, 
      subcategory,
      minAmount, 
      maxAmount,
      location,
      providerId,
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { 
      isPublic: true, 
      status: 'active' 
    };
    
    console.log('🔍 Initial filter:', filter);
    
    // Add filters
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (providerId) filter.providerId = providerId;
    if (minAmount || maxAmount) {
      filter['coverageDetails.minAmount'] = {};
      if (minAmount) filter['coverageDetails.minAmount'].$gte = Number(minAmount);
      if (maxAmount) filter['coverageDetails.maxAmount'].$lte = Number(maxAmount);
    }
    if (location) {
      filter['eligibility.locations'] = { $in: [new RegExp(location, 'i')] };
    }

    console.log('🔍 Final filter:', JSON.stringify(filter, null, 2));

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    console.log('🔍 About to query database...');
    const offers = await InsuranceOffer.find(filter)
      .populate('providerId', 'profile.companyName profile.firstName profile.lastName profile.avgRating profile.totalReviews')
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    console.log('🔍 Found offers:', offers.length);
    console.log('🔍 Offer IDs:', offers.map(o => o._id));

    // Get total count for pagination
    const total = await InsuranceOffer.countDocuments(filter);
    console.log('🔍 Total count:', total);

    const response = {
      offers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalOffers: total,
        hasNextPage: skip + offers.length < total,
        hasPrevPage: Number(page) > 1
      }
    };

    console.log('🔍 Sending response with', offers.length, 'offers');
    res.json(response);
  } catch (error) {
    console.error('🔍 Get offers error:', error);
    res.status(500).json({ 
      message: 'Server error during offers retrieval',
      code: 'GET_OFFERS_ERROR',
      error: error.message
    });
  }
});

// @route   GET /api/offers/:id
// @desc    Get specific insurance offer
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const offer = await InsuranceOffer.findById(req.params.id)
      .populate('providerId', 'profile.companyName profile.firstName profile.lastName profile.avgRating profile.totalReviews profile.bio');

    if (!offer) {
      return res.status(404).json({ 
        message: 'Insurance offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    if (!offer.isPublic || offer.status !== 'active') {
      return res.status(404).json({ 
        message: 'Insurance offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    // Increment view count
    offer.viewCount = (offer.viewCount || 0) + 1;
    await offer.save();

    res.json(offer);
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'GET_OFFER_ERROR'
    });
  }
});

// @route   POST /api/offers
// @desc    Create insurance offer (Provider only)
// @access  Private (Provider) - Temporarily removed KYC requirement for development
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      coverageDetails,
      terms,
      pricing,
      eligibility,
      features,
      documents,
      tags,
      highlights,
      specialOffers
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !coverageDetails || !terms || !pricing) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate coverage details
    if (!coverageDetails.minAmount || !coverageDetails.maxAmount || !pricing.basePremium) {
      return res.status(400).json({ 
        message: 'Missing coverage or pricing details',
        code: 'MISSING_COVERAGE_DETAILS'
      });
    }

    // Create insurance offer
    const insuranceOffer = new InsuranceOffer({
      providerId: req.user.id,
      title,
      description,
      category,
      subcategory,
      coverageDetails,
      terms,
      pricing,
      eligibility: eligibility || {},
      features: features || [],
      documents: documents || [],
      tags: tags || [],
      highlights: highlights || [],
      specialOffers: specialOffers || [],
      status: 'active',        // Set to active by default
      isPublic: true           // Set to public by default
    });

    await insuranceOffer.save();

    // Log offer creation
    await logAction('insurance_offer_created')(req, res, () => {});

    res.status(201).json({
      message: 'Insurance offer created successfully',
      offer: insuranceOffer
    });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ 
      message: 'Server error during offer creation',
      code: 'CREATE_OFFER_ERROR'
    });
  }
});

// @route   PUT /api/offers/:id
// @desc    Update insurance offer
// @access  Private (Owner Provider)
router.put('/:id', protect, requireVerifiedProvider, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const offer = await InsuranceOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ 
        message: 'Insurance offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    // Check ownership
    if (offer.providerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to update this offer',
        code: 'UNAUTHORIZED_UPDATE'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'subcategory', 'coverageDetails', 'terms',
      'pricing', 'eligibility', 'features', 'documents', 'tags',
      'highlights', 'specialOffers', 'status', 'isPublic'
    ];

    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        offer[field] = updateData[field];
      }
    });

    await offer.save();

    // Log offer update
    await logAction('insurance_offer_updated')(req, res, () => {});

    res.json({
      message: 'Insurance offer updated successfully',
      offer
    });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ 
      message: 'Server error during offer update',
      code: 'UPDATE_OFFER_ERROR'
    });
  }
});

// @route   DELETE /api/offers/:id
// @desc    Delete insurance offer
// @access  Private (Owner Provider)
router.delete('/:id', protect, requireVerifiedProvider, async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await InsuranceOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ 
        message: 'Insurance offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    // Check ownership
    if (offer.providerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this offer',
        code: 'UNAUTHORIZED_DELETE'
      });
    }

    await InsuranceOffer.findByIdAndDelete(id);

    // Log offer deletion
    await logAction('insurance_offer_deleted')(req, res, () => {});

    res.json({ message: 'Insurance offer deleted successfully' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ 
      message: 'Server error during offer deletion',
      code: 'DELETE_OFFER_ERROR'
    });
  }
});

// @route   GET /api/offers/provider/my-offers
// @desc    Get provider's own offers
// @access  Private (Provider)
router.get('/provider/my-offers', protect, async (req, res) => {
  try {
    console.log('🔍 Debug: Provider offers route called for user:', req.user.id);
    const { status, limit = 50, page = 1 } = req.query;
    
    const filter = { providerId: req.user.id };
    if (status) filter.status = status;

    console.log('🔍 Debug: Filter:', filter);

    const skip = (Number(page) - 1) * Number(limit);

    const offers = await InsuranceOffer.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    console.log('🔍 Debug: Found offers:', offers.length);

    // Get accepted offers for each offer
    const offersWithAcceptance = await Promise.all(offers.map(async (offer) => {
      console.log(`🔍 Debug: Processing offer ${offer.title} (${offer._id})`);
      
      const acceptedOffers = await AcceptedOffer.find({ 
        offerId: offer._id, 
        status: 'active' 
      }).populate('clientId', 'profile.firstName profile.lastName email profile.phone');

      console.log(`🔍 Debug: Found ${acceptedOffers.length} accepted offers for ${offer.title}`);

      const offerObj = offer.toObject();
      offerObj.acceptedOffers = acceptedOffers;
      offerObj.acceptedCount = acceptedOffers.length;
      offerObj.totalAcceptedCoverage = acceptedOffers.reduce((sum, ao) => sum + ao.coverageAmount, 0);
      offerObj.totalAcceptedPremium = acceptedOffers.reduce((sum, ao) => sum + ao.monthlyPremium, 0);
      
      console.log(`🔍 Debug: Offer ${offer.title} - acceptedCount: ${offerObj.acceptedCount}, totalCoverage: ${offerObj.totalAcceptedCoverage}, totalPremium: ${offerObj.totalAcceptedPremium}`);
      
      return offerObj;
    }));

    const total = await InsuranceOffer.countDocuments(filter);

    console.log('🔍 Debug: Final response - offers with acceptance data:', offersWithAcceptance.length);
    console.log('🔍 Debug: Sample offer data:', JSON.stringify(offersWithAcceptance[0], null, 2));

    res.json({
      offers: offersWithAcceptance,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalOffers: total,
        hasNextPage: skip + offers.length < total,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Get provider offers error:', error);
    res.status(500).json({ 
      message: 'Server error during provider offers retrieval',
      code: 'GET_PROVIDER_OFFERS_ERROR'
    });
  }
});

// @route   POST /api/offers/:id/toggle-status
// @desc    Toggle offer status (active/paused)
// @access  Private (Owner Provider)
router.post('/:id/toggle-status', protect, requireVerifiedProvider, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be "active" or "paused"',
        code: 'INVALID_STATUS'
      });
    }

    const offer = await InsuranceOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ 
        message: 'Insurance offer not found',
        code: 'OFFER_NOT_FOUND'
      });
    }

    // Check ownership
    if (offer.providerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to update this offer',
        code: 'UNAUTHORIZED_UPDATE'
      });
    }

    offer.status = status;
    await offer.save();

    // Log status change
    await logAction('insurance_offer_status_changed')(req, res, () => {});

    res.json({
      message: `Insurance offer ${status} successfully`,
      offer
    });
  } catch (error) {
    console.error('Toggle offer status error:', error);
    res.status(500).json({ 
      message: 'Server error during status change',
      code: 'TOGGLE_STATUS_ERROR'
    });
  }
});

// Debug endpoint to check all offers
router.get('/debug/all-offers', async (req, res) => {
  try {
    console.log('🔍 Debug: Fetching all offers...');
    
    const allOffers = await InsuranceOffer.find({})
      .select('title status isPublic createdAt providerId coverageDetails pricing');
    
    console.log('🔍 Debug: Found offers:', allOffers.length);
    
    res.json({
      message: 'All offers in database',
      totalOffers: allOffers.length,
      offers: allOffers
    });
  } catch (error) {
    console.error('🔍 Debug offers error:', error);
    res.status(500).json({ 
      message: 'Error fetching offers',
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint to test provider offers with acceptance data
router.get('/debug/provider-offers-test/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    console.log('🔍 Debug: Testing provider offers for:', providerId);
    
    // Get offers for this provider
    const offers = await InsuranceOffer.find({ providerId });
    console.log('🔍 Debug: Found offers:', offers.length);
    
    // Get accepted offers for each offer
    const offersWithAcceptance = await Promise.all(offers.map(async (offer) => {
      const acceptedOffers = await AcceptedOffer.find({ 
        offerId: offer._id, 
        status: 'active' 
      }).populate('clientId', 'profile.firstName profile.lastName email profile.phone');

      const offerObj = offer.toObject();
      offerObj.acceptedOffers = acceptedOffers;
      offerObj.acceptedCount = acceptedOffers.length;
      offerObj.totalAcceptedCoverage = acceptedOffers.reduce((sum, ao) => sum + ao.coverageAmount, 0);
      offerObj.totalAcceptedPremium = acceptedOffers.reduce((sum, ao) => sum + ao.monthlyPremium, 0);
      
      console.log(`🔍 Debug: Offer ${offer.title} has ${acceptedOffers.length} accepted offers`);
      
      return offerObj;
    }));
    
    res.json({
      message: 'Provider offers test',
      providerId,
      totalOffers: offers.length,
      offers: offersWithAcceptance
    });
  } catch (error) {
    console.error('🔍 Debug provider offers test error:', error);
    res.status(500).json({ 
      message: 'Error testing provider offers',
      error: error.message,
      stack: error.stack
    });
  }
});

// Fix existing offers - make them public and active
router.post('/debug/fix-offers', protect, async (req, res) => {
  try {
    const result = await InsuranceOffer.updateMany(
      { providerId: req.user.id },
      { 
        $set: { 
          status: 'active',
          isPublic: true
        }
      }
    );
    
    res.json({
      message: 'Fixed existing offers',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Fix offers error:', error);
    res.status(500).json({ message: 'Error fixing offers' });
  }
});

// Fix offer data - add missing required fields
router.post('/debug/fix-offer-data/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { coverageDetails, pricing } = req.body;
    
    const offer = await InsuranceOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Check ownership
    if (offer.providerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update missing fields
    if (coverageDetails) {
      offer.coverageDetails = { ...offer.coverageDetails, ...coverageDetails };
    }
    if (pricing) {
      offer.pricing = { ...offer.pricing, ...pricing };
    }
    
    await offer.save();
    
    res.json({
      message: 'Offer data fixed successfully',
      offer
    });
  } catch (error) {
    console.error('Fix offer data error:', error);
    res.status(500).json({ message: 'Error fixing offer data' });
  }
});

module.exports = router;


