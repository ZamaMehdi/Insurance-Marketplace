const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { logAction } = require('../middleware/audit.middleware');
const InsuranceRequest = require('../models/InsuranceRequest.model');

// @route   GET /api/requests
// @desc    Get public insurance requests with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Debug: GET /api/requests called with query:', req.query);
    
    const { 
      assetType, 
      minAmount, 
      maxAmount,
      location,
      status,
      groupInsurance,
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { 
      isPublic: true,
      status: { $in: ['open', 'bidding'] } // Only show active requests
    };
    
    console.log('🔍 Debug: Initial filter:', filter);
    
    // Add filters
    if (assetType) filter['assetDetails.type'] = assetType;
    if (minAmount || maxAmount) {
      filter['insuranceDetails.requestedAmount'] = {};
      if (minAmount) filter['insuranceDetails.requestedAmount'].$gte = Number(minAmount);
      if (maxAmount) filter['insuranceDetails.requestedAmount'].$lte = Number(maxAmount);
    }
    if (location) {
      filter['$or'] = [
        { 'assetDetails.location.city': { $regex: location, $options: 'i' } },
        { 'assetDetails.location.state': { $regex: location, $options: 'i' } },
        { 'assetDetails.location.country': { $regex: location, $options: 'i' } }
      ];
    }
    if (status) {
      // Handle both single status and array of statuses
      if (Array.isArray(status)) {
        filter.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        // Handle comma-separated string like 'open,bidding'
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }
    
    // Add group insurance filter
    if (groupInsurance === 'true') {
      filter['biddingDetails.groupInsuranceAllowed'] = true;
      console.log('🔍 Debug: Added group insurance filter');
    }

    console.log('🔍 Debug: Final filter:', filter);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    console.log('🔍 Debug: Starting database query...');
    const requests = await InsuranceRequest.find(filter)
      .populate('clientId', 'profile.companyName profile.firstName profile.lastName')
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    console.log('🔍 Debug: Database query completed, found requests:', requests.length);

    // Get total count for pagination
    const total = await InsuranceRequest.countDocuments(filter);
    console.log('🔍 Debug: Total count:', total);

    const response = {
      requests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRequests: total,
        hasNextPage: skip + requests.length < total,
        hasPrevPage: Number(page) > 1
      }
    };

    console.log('🔍 Debug: Sending response with', requests.length, 'requests');
    res.json(response);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ 
      message: 'Server error during requests retrieval',
      code: 'GET_REQUESTS_ERROR'
    });
  }
});

// @route   GET /api/requests/client/my-requests
// @desc    Get client's own requests
// @access  Private (Client)
router.get('/client/my-requests', protect, async (req, res) => {
  try {
    console.log('🔐 Debug - Route accessed by user:', req.user);
    console.log('🔐 Debug - User ID:', req.user.id);
    console.log('🔐 Debug - User role:', req.user.role);
    
    const { status, limit = 50, page = 1 } = req.query;
    
    const filter = { clientId: req.user.id };
    if (status) filter.status = status;

    console.log('🔐 Debug - Filter:', filter);
    console.log('🔐 Debug - Starting database query...');

    const startTime = Date.now();
    const requests = await InsuranceRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const queryTime = Date.now() - startTime;
    console.log('🔐 Debug - Database query completed in:', queryTime, 'ms');

    const total = await InsuranceRequest.countDocuments(filter);
    const totalTime = Date.now() - startTime;
    console.log('🔐 Debug - Total count query completed in:', totalTime, 'ms');

    console.log('🔐 Debug - Found requests:', requests.length);
    console.log('🔐 Debug - Total count:', total);
    console.log('🔐 Debug - Response data structure:', {
      requestsLength: requests.length,
      hasRequests: !!requests,
      requestsType: typeof requests,
      isArray: Array.isArray(requests)
    });

    const responseData = {
      success: true,
      data: requests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRequests: total,
        hasNextPage: (Number(page) - 1) * Number(limit) + requests.length < total,
        hasPrevPage: Number(page) > 1
      }
    };

    console.log('🔐 Debug - Sending response...');
    res.json(responseData);
    console.log('🔐 Debug - Response sent successfully');
  } catch (error) {
    console.error('🔐 Debug - Error in /client/my-requests:', error);
    res.status(500).json({ 
      message: 'Server error during client requests retrieval',
      code: 'GET_CLIENT_REQUESTS_ERROR'
    });
  }
});

// @route   GET /api/requests/client/:clientId
// @desc    Get requests by specific client ID
// @access  Private
router.get('/client/:clientId', protect, async (req, res) => {
  try {
    console.log('🔍 Debug - /client/:clientId route accessed');
    console.log('🔍 Debug - Client ID from params:', req.params.clientId);
    console.log('🔍 Debug - User from token:', req.user.id);
    
    const { clientId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;
    
    // Security check: Users can only access their own requests, admins can access any
    if (req.user.role !== 'admin' && req.user.id !== clientId) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own requests.',
        code: 'ACCESS_DENIED'
      });
    }
    
    const filter = { clientId: clientId };
    if (status) {
      // Handle both single status and array of statuses
      if (Array.isArray(status)) {
        filter.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        // Handle comma-separated string like 'open,bidding'
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }

    console.log('🔍 Debug - Database filter:', filter);
    console.log('🔍 Debug - Starting database query...');

    const requests = await InsuranceRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    console.log('🔍 Debug - Database query completed');
    console.log('🔍 Debug - Found requests:', requests.length);
    console.log('🔍 Debug - Requests:', requests);

    const total = await InsuranceRequest.countDocuments(filter);
    console.log('🔍 Debug - Total count:', total);

    res.json({
      success: true,
      data: requests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRequests: total,
        hasNextPage: (Number(page) - 1) * Number(limit) + requests.length < total,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Get client requests error:', error);
    res.status(500).json({ 
      message: 'Server error during client requests retrieval',
      code: 'GET_CLIENT_REQUESTS_ERROR'
    });
  }
});

// @route   GET /api/requests/:id
// @desc    Get specific insurance request
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const request = await InsuranceRequest.findById(req.params.id)
      .populate('clientId', 'profile.companyName profile.firstName profile.lastName profile.bio')
      .populate('bids.providerId', 'profile.companyName profile.firstName profile.lastName profile.avgRating');

    if (!request) {
      return res.status(404).json({ 
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    if (!request.isPublic) {
      return res.status(404).json({ 
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Increment view count
    request.viewCount = (request.viewCount || 0) + 1;
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'GET_REQUEST_ERROR'
    });
  }
});

// @route   POST /api/requests
// @desc    Create insurance request (Client only)
// @access  Private (Client)
router.post('/', protect, authorize('client'), async (req, res) => {
  try {
    const {
      title,
      description,
      assetDetails,
      insuranceDetails,
      biddingDetails,
      tags,
      priority
    } = req.body;

    // Validate required fields
    if (!title || !description || !assetDetails || !insuranceDetails || !biddingDetails) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate asset details
    if (!assetDetails.type || !assetDetails.name || !assetDetails.value) {
      return res.status(400).json({ 
        message: 'Missing asset details',
        code: 'MISSING_ASSET_DETAILS'
      });
    }

    // Validate insurance details
    if (!insuranceDetails.requestedAmount || !insuranceDetails.coverageType) {
      return res.status(400).json({ 
        message: 'Missing insurance details',
        code: 'MISSING_INSURANCE_DETAILS'
      });
    }

    // Validate bidding details
    if (!biddingDetails.deadline) {
      return res.status(400).json({ 
        message: 'Missing bidding deadline',
        code: 'MISSING_BIDDING_DETAILS'
      });
    }

    // Check if deadline is in the future
    if (new Date(biddingDetails.deadline) <= new Date()) {
      return res.status(400).json({ 
        message: 'Bidding deadline must be in the future',
        code: 'INVALID_DEADLINE'
      });
    }

    // Create insurance request
    const insuranceRequest = new InsuranceRequest({
      clientId: req.user.id,
      title,
      description,
      assetDetails,
      insuranceDetails,
      biddingDetails,
      tags: tags || [],
      priority: priority || 'medium'
    });

    await insuranceRequest.save();

    // Log request creation
    await logAction('insurance_request_created')(req, res, () => {});

    res.status(201).json({
      message: 'Insurance request created successfully',
      request: insuranceRequest
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ 
      message: 'Server error during request creation',
      code: 'CREATE_REQUEST_ERROR'
    });
  }
});

// @route   PUT /api/requests/:id
// @desc    Update insurance request
// @access  Private (Owner Client)
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const request = await InsuranceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to update this request',
        code: 'UNAUTHORIZED_UPDATE'
      });
    }

    // Only allow updates if no bids have been submitted
    if (request.bidCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot update request after bids have been submitted',
        code: 'BIDS_EXIST'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'assetDetails', 'insuranceDetails', 
      'biddingDetails', 'tags', 'priority'
    ];

    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        request[field] = updateData[field];
      }
    });

    await request.save();

    // Log request update
    await logAction('insurance_request_updated')(req, res, () => {});

    res.json({
      message: 'Insurance request updated successfully',
      request
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ 
      message: 'Server error during request update',
      code: 'UPDATE_REQUEST_ERROR'
    });
  }
});

// @route   DELETE /api/requests/:id
// @desc    Delete insurance request
// @access  Private (Owner Client)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await InsuranceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this request',
        code: 'UNAUTHORIZED_DELETE'
      });
    }

    // Only allow deletion if no bids have been submitted
    if (request.bidCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete request after bids have been submitted',
        code: 'BIDS_EXIST'
      });
    }

    await InsuranceRequest.findByIdAndDelete(id);

    // Log request deletion
    await logAction('insurance_request_deleted')(req, res, () => {});

    res.json({ message: 'Insurance request deleted successfully' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ 
      message: 'Server error during request deletion',
      code: 'DELETE_REQUEST_ERROR'
    });
  }
});

// @route   POST /api/requests/:id/bid
// @desc    Submit a bid on insurance request
// @access  Private (Provider)
router.post('/:id/bid', protect, authorize('provider'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, percentage, premium, terms, conditions } = req.body;

    // Validate bid data
    if (!amount || !percentage || !premium) {
      return res.status(400).json({ 
        message: 'Missing bid details',
        code: 'MISSING_BID_DETAILS'
      });
    }

    const request = await InsuranceRequest.findById(id);
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

    // Add bid to request
    const newBid = {
      providerId: req.user.id,
      amount,
      percentage,
      premium,
      terms,
      conditions: conditions || []
    };

    request.bids.push(newBid);
    request.bidCount = request.bids.length;
    
    // Update status to bidding if this is the first bid
    if (request.status === 'open') {
      request.status = 'bidding';
    }

    await request.save();

    // Log bid submission
    await logAction('bid_submitted')(req, res, () => {});

    res.status(201).json({
      message: 'Bid submitted successfully',
      bid: newBid
    });
  } catch (error) {
    console.error('Submit bid error:', error);
    res.status(500).json({ 
      message: 'Server error during bid submission',
      code: 'SUBMIT_BID_ERROR'
    });
  }
});

// @route   PUT /api/requests/:id/bids/:bidId/respond
// @desc    Accept/Reject a bid
// @access  Private (Owner Client)
router.put('/:id/bids/:bidId/respond', protect, async (req, res) => {
  try {
    const { id, bidId } = req.params;
    const { action, note } = req.body; // action: 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ 
        message: 'Invalid action. Must be "accept" or "reject"',
        code: 'INVALID_ACTION'
      });
    }

    const request = await InsuranceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to respond to bids',
        code: 'UNAUTHORIZED_ACTION'
      });
    }

    // Find the bid
    const bid = request.bids.id(bidId);
    if (!bid) {
      return res.status(404).json({ 
        message: 'Bid not found',
        code: 'BID_NOT_FOUND'
      });
    }

    // Update bid status
    bid.status = action === 'accept' ? 'accepted' : 'rejected';
    bid.responseAt = new Date();
    bid.responseNote = note;

    if (action === 'accept') {
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
    }

    await request.save();

    // Log bid response
    await logAction(`bid_${action}ed`)(req, res, () => {});

    res.json({
      message: `Bid ${action}ed successfully`,
      request
    });
  } catch (error) {
    console.error('Respond to bid error:', error);
    res.status(500).json({ 
      message: 'Server error during bid response',
      code: 'BID_RESPONSE_ERROR'
    });
  }
});

// @route   GET /api/requests/provider/available
// @desc    Get available requests for providers to bid on
// @access  Private (Provider)
router.get('/provider/available', protect, authorize('provider'), async (req, res) => {
  try {
    const { 
      assetType, 
      minAmount, 
      maxAmount,
      location,
      limit = 20,
      page = 1
    } = req.query;

    const filter = { 
      isPublic: true,
      status: { $in: ['open', 'bidding'] },
      'biddingDetails.deadline': { $gt: new Date() } // Only show active requests
    };
    
    // Add filters
    if (assetType) filter['assetDetails.type'] = assetType;
    if (minAmount || maxAmount) {
      filter['insuranceDetails.requestedAmount'] = {};
      if (minAmount) filter['insuranceDetails.requestedAmount'].$gte = Number(minAmount);
      if (maxAmount) filter['insuranceDetails.requestedAmount'].$lte = Number(maxAmount);
    }
    if (location) {
      filter['$or'] = [
        { 'assetDetails.location.city': { $regex: location, $options: 'i' } },
        { 'assetDetails.location.state': { $regex: location, $options: 'i' } },
        { 'assetDetails.location.country': { $regex: location, $options: 'i' } }
      ];
    }

    // Exclude requests where provider has already bid
    filter['bids.providerId'] = { $ne: req.user.id };

    const skip = (Number(page) - 1) * Number(limit);

    const requests = await InsuranceRequest.find(filter)
      .populate('clientId', 'profile.companyName profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await InsuranceRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRequests: total,
        hasNextPage: skip + requests.length < total,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Get available requests error:', error);
    res.status(500).json({ 
      message: 'Server error during available requests retrieval',
      code: 'GET_AVAILABLE_REQUESTS_ERROR'
    });
  }
});

// @route   PUT /api/requests/:id/finalize
// @desc    Finalize insurance deal when fully covered
// @access  Private (Owner Client)
router.put('/:id/finalize', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await InsuranceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ 
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Not authorized to finalize this request',
        code: 'UNAUTHORIZED_ACTION'
      });
    }

    // Check if fully covered
    if (request.totalAwardedPercentage < 100) {
      return res.status(400).json({ 
        message: 'Cannot finalize deal until 100% coverage is achieved',
        code: 'INSUFFICIENT_COVERAGE'
      });
    }

    // Check if already finalized
    if (request.status === 'awarded') {
      return res.status(400).json({ 
        message: 'Deal is already finalized',
        code: 'ALREADY_FINALIZED'
      });
    }

    // Update status to awarded
    request.status = 'awarded';
    await request.save();

    // Log deal finalization
    await logAction('insurance_deal_finalized')(req, res, () => {});

    res.json({
      message: 'Insurance deal finalized successfully',
      request
    });
  } catch (error) {
    console.error('Finalize deal error:', error);
    res.status(500).json({ 
      message: 'Server error during deal finalization',
      code: 'FINALIZE_DEAL_ERROR'
    });
  }
});

// @route   POST /api/requests/sample-data
// @desc    Create sample insurance requests for testing
// @access  Private (Temporary for development)
router.post('/sample-data', protect, async (req, res) => {
  try {
    console.log('🔍 Debug - Creating sample data for user:', req.user.id);
    
    const sampleRequests = [
      {
        clientId: req.user.id,
        title: 'Commercial Property Insurance',
        description: 'Need comprehensive coverage for office building in downtown area',
        category: 'property',
        assetDetails: {
          type: 'property',
          name: 'Office Building',
          value: 2500000,
          currency: 'USD',
          location: {
            address: '123 Business Ave',
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 2000000,
          currency: 'USD',
          coverageType: 'full',
          riskLevel: 'medium'
        },
        biddingDetails: {
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          minimumBidPercentage: 10,
          allowPartialBids: true,
          groupInsuranceAllowed: false
        },
        status: 'open',
        isPublic: true,
        tags: ['commercial', 'property', 'office'],
        priority: 'high'
      },
      {
        clientId: req.user.id,
        title: 'Fleet Auto Insurance',
        description: 'Insurance coverage for company fleet of 25 vehicles',
        category: 'auto',
        assetDetails: {
          type: 'vehicle',
          name: 'Company Fleet',
          value: 1500000,
          currency: 'USD',
          location: {
            address: '456 Fleet Street',
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA'
          }
        },
        insuranceDetails: {
          requestedAmount: 1200000,
          currency: 'USD',
          coverageType: 'full',
          riskLevel: 'medium'
        },
        biddingDetails: {
          deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          minimumBidPercentage: 15,
          allowPartialBids: true,
          groupInsuranceAllowed: true
        },
        status: 'open',
        isPublic: true,
        tags: ['fleet', 'auto', 'commercial'],
        priority: 'medium'
      }
    ];

    // Clear existing requests for this user
    await InsuranceRequest.deleteMany({ clientId: req.user.id });
    console.log('🗑️ Cleared existing requests for user');

    // Create new sample requests
    const createdRequests = await InsuranceRequest.insertMany(sampleRequests);
    console.log('✅ Created', createdRequests.length, 'sample requests');

    res.json({
      success: true,
      message: `Created ${createdRequests.length} sample insurance requests`,
      requests: createdRequests
    });

  } catch (error) {
    console.error('Error creating sample data:', error);
    res.status(500).json({ 
      message: 'Server error during sample data creation',
      code: 'SAMPLE_DATA_ERROR'
    });
  }
});

// @route   PUT /api/requests/:id/status
// @desc    Update insurance request status
// @access  Private (Owner Client)
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

    const request = await InsuranceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        message: 'Insurance request not found',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Check ownership
    if (request.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Not authorized to update this request',
        code: 'UNAUTHORIZED_UPDATE'
      });
    }

    // Update status
    request.status = status;
    await request.save();

    res.json({
      success: true,
      message: 'Request status updated successfully',
      request
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      message: 'Server error during status update',
      code: 'UPDATE_STATUS_ERROR'
    });
  }
});

// @route   GET /api/requests/debug/group-insurance
// @desc    Debug endpoint to check group insurance requests
// @access  Public
router.get('/debug/group-insurance', async (req, res) => {
  try {
    console.log('🔍 Debug: Checking group insurance requests...');
    
    // Get all requests
    const allRequests = await InsuranceRequest.find({}).select('title status biddingDetails.groupInsuranceAllowed isPublic');
    console.log('🔍 Debug: All requests:', allRequests.length);
    
    // Get group insurance requests
    const groupRequests = await InsuranceRequest.find({
      'biddingDetails.groupInsuranceAllowed': true,
      isPublic: true,
      status: { $in: ['open', 'bidding'] }
    }).select('title status biddingDetails.groupInsuranceAllowed isPublic');
    
    console.log('🔍 Debug: Group insurance requests:', groupRequests.length);
    console.log('🔍 Debug: Group insurance details:', groupRequests);
    
    res.json({
      totalRequests: allRequests.length,
      groupInsuranceRequests: groupRequests.length,
      allRequests: allRequests,
      groupRequests: groupRequests
    });
  } catch (error) {
    console.error('Debug group insurance error:', error);
    res.status(500).json({ 
      message: 'Debug error',
      error: error.message
    });
  }
});

module.exports = router;


