const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, authorize, requireVerifiedProvider } = require('../middleware/auth.middleware');
const { logAction } = require('../middleware/audit.middleware');

// @route   GET /api/providers
// @desc    Search/filter for providers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      expertise, 
      minRating, 
      location, 
      category,
      limit = 20,
      page = 1,
      sortBy = 'profile.avgRating',
      sortOrder = 'desc'
    } = req.query;

    const filter = { 
      role: 'provider', 
      kycStatus: 'verified',
      isActive: true
    };

    // Add filters
    if (expertise) {
      filter['profile.expertise'] = { $in: expertise.split(',') };
    }
    
    if (minRating) {
      filter['profile.avgRating'] = { $gte: Number(minRating) };
    }

    if (location) {
      const locationFilter = {};
      if (location.city) locationFilter['profile.location.city'] = new RegExp(location.city, 'i');
      if (location.state) locationFilter['profile.location.state'] = new RegExp(location.state, 'i');
      if (location.country) locationFilter['profile.location.country'] = new RegExp(location.country, 'i');
      
      if (Object.keys(locationFilter).length > 0) {
        Object.assign(filter, locationFilter);
      }
    }

    if (category) {
      filter['profile.expertise'] = { $in: [category] };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const providers = await User.find(filter)
      .select('-password -emailVerificationToken -kycDocuments')
      .sort(sort)
      .limit(Number(limit))
      .skip(skip)
      .populate('profile.expertise');

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.json({
      providers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProviders: total,
        hasNextPage: skip + providers.length < total,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Provider search error:', error);
    res.status(500).json({ 
      message: 'Server error during provider search',
      code: 'PROVIDER_SEARCH_ERROR'
    });
  }
});

// @route   GET /api/providers/:id
// @desc    Get a provider's public profile
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const provider = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -kycDocuments')
      .populate('profile.expertise');

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ 
        message: 'Provider not found',
        code: 'PROVIDER_NOT_FOUND'
      });
    }

    if (!provider.isActive || provider.kycStatus !== 'verified') {
      return res.status(404).json({ 
        message: 'Provider not available',
        code: 'PROVIDER_NOT_AVAILABLE'
      });
    }

    // Increment view count
    provider.viewCount = (provider.viewCount || 0) + 1;
    await provider.save();

    res.json(provider);
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'GET_PROVIDER_ERROR'
    });
  }
});

// @route   PUT /api/providers/profile
// @desc    Update provider profile
// @access  Private (Provider)
router.put('/profile', protect, requireVerifiedProvider, async (req, res) => {
  try {
    const { 
      companyName, 
      expertise, 
      bio, 
      location, 
      website, 
      socialMedia,
      phone 
    } = req.body;

    const user = await User.findById(req.user.id);
    
    // Update profile fields
    if (companyName !== undefined) user.profile.companyName = companyName;
    if (expertise !== undefined) user.profile.expertise = expertise;
    if (bio !== undefined) user.profile.bio = bio;
    if (location !== undefined) user.profile.location = location;
    if (website !== undefined) user.profile.website = website;
    if (socialMedia !== undefined) user.profile.socialMedia = socialMedia;
    if (phone !== undefined) user.profile.phone = phone;

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

// @route   GET /api/providers/:id/reviews
// @desc    Get provider reviews
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const provider = await User.findById(req.params.id)
      .select('profile.ratings')
      .populate('profile.ratings.raterId', 'profile.firstName profile.lastName');

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ 
        message: 'Provider not found',
        code: 'PROVIDER_NOT_FOUND'
      });
    }

    const reviews = provider.profile.ratings
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(skip, skip + Number(limit));

    const total = provider.profile.ratings.length;

    res.json({
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalReviews: total,
        hasNextPage: skip + reviews.length < total,
        hasPrevPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'GET_REVIEWS_ERROR'
    });
  }
});

// @route   GET /api/providers/:id/stats
// @desc    Get provider statistics
// @access  Public
router.get('/:id/stats', async (req, res) => {
  try {
    const provider = await User.findById(req.params.id)
      .select('profile.avgRating profile.totalReviews profile.ratings');

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ 
        message: 'Provider not found',
        code: 'PROVIDER_NOT_FOUND'
      });
    }

    // Calculate rating distribution
    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    provider.profile.ratings.forEach(rating => {
      ratingDistribution[rating.rating]++;
    });

    const stats = {
      averageRating: provider.profile.avgRating,
      totalReviews: provider.profile.totalReviews,
      ratingDistribution,
      responseRate: provider.profile.totalReviews > 0 ? 95 : 0, // Placeholder
      completionRate: provider.profile.totalReviews > 0 ? 98 : 0 // Placeholder
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'GET_STATS_ERROR'
    });
  }
});

// @route   GET /api/providers/top-rated
// @desc    Get top-rated providers
// @access  Public
router.get('/top-rated/list', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;

    const filter = { 
      role: 'provider', 
      kycStatus: 'verified',
      isActive: true,
      'profile.avgRating': { $gt: 0 }
    };

    if (category) {
      filter['profile.expertise'] = { $in: [category] };
    }

    const topProviders = await User.find(filter)
      .select('-password -emailVerificationToken -kycDocuments')
      .sort({ 'profile.avgRating': -1, 'profile.totalReviews': -1 })
      .limit(Number(limit));

    res.json(topProviders);
  } catch (error) {
    console.error('Get top providers error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'GET_TOP_PROVIDERS_ERROR'
    });
  }
});

module.exports = router;






