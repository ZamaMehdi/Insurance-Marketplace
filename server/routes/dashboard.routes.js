const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const InsuranceRequest = require('../models/InsuranceRequest.model');
const Bid = require('../models/Bid.model');
const AcceptedOffer = require('../models/AcceptedOffer.model');

// Get dashboard statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let stats = {};
    
    if (user.role === 'client') {
      // Client statistics
      const totalRequests = await InsuranceRequest.countDocuments({ clientId: userId });
      const activeRequests = await InsuranceRequest.countDocuments({ 
        clientId: userId, 
        status: { $in: ['active', 'pending'] } 
      });
      const totalBids = await Bid.countDocuments({ requestId: { $in: await InsuranceRequest.find({ clientId: userId }).select('_id') } });
      const acceptedOffersCount = await AcceptedOffer.countDocuments({ clientId: userId, status: 'active' });
      
      stats = {
        totalRequests,
        activeRequests,
        totalBids,
        acceptedOffersCount,
        completedRequests: totalRequests - activeRequests
      };
    } else if (user.role === 'provider') {
      // Provider statistics
      const totalOffers = await InsuranceRequest.countDocuments({ providerId: userId });
      const activeOffers = await InsuranceRequest.countDocuments({ 
        providerId: userId, 
        status: { $in: ['active', 'pending'] } 
      });
      const totalBids = await Bid.countDocuments({ providerId: userId });
      const acceptedBids = await Bid.countDocuments({ providerId: userId, status: 'accepted' });
      
      stats = {
        totalOffers,
        activeOffers,
        totalBids,
        acceptedBids,
        completedOffers: totalOffers - activeOffers
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to load dashboard statistics' });
  }
});

// Get recent insurance requests
router.get('/recent-requests', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let requests = [];
    
    if (user.role === 'client') {
      requests = await InsuranceRequest.find({ clientId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('providerId', 'companyName email');
    } else if (user.role === 'provider') {
      requests = await InsuranceRequest.find({ providerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('clientId', 'firstName lastName email');
    }

    res.json({ requests });
  } catch (error) {
    console.error('Recent requests error:', error);
    res.status(500).json({ message: 'Failed to load recent requests' });
  }
});

// Get recent bids
router.get('/recent-bids', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let bids = [];
    
    if (user.role === 'client') {
      // Get bids for client's requests
      const clientRequests = await InsuranceRequest.find({ clientId: userId }).select('_id');
      const requestIds = clientRequests.map(req => req._id);
      
      bids = await Bid.find({ requestId: { $in: requestIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('providerId', 'companyName email')
        .populate('requestId', 'title amount');
    } else if (user.role === 'provider') {
      // Get provider's bids
      bids = await Bid.find({ providerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('requestId', 'title amount clientId');
    }

    res.json({ bids });
  } catch (error) {
    console.error('Recent bids error:', error);
    res.status(500).json({ message: 'Failed to load recent bids' });
  }
});

// Get notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For now, return empty notifications array
    // You can implement actual notification system later
    const notifications = [];
    
    res.json({ notifications });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

// Get active chats
router.get('/active-chats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For now, return empty chats array
    // You can implement actual chat system later
    const activeChats = [];
    
    res.json({ activeChats });
  } catch (error) {
    console.error('Active chats error:', error);
    res.status(500).json({ message: 'Failed to load active chats' });
  }
});

module.exports = router;
