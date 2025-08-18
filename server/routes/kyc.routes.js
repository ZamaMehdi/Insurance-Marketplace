const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth.middleware');
const KYC = require('../models/KYC.model');
const User = require('../models/User.model');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/kyc';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'), false);
    }
  }
});

// @route   GET /api/kyc/status
// @desc    Get KYC status for current provider
// @access  Private (Providers only)
router.get('/status', protect, authorize('provider'), async (req, res) => {
  try {
    const kyc = await KYC.findByProviderId(req.user._id);
    
    if (!kyc) {
      return res.json({
        success: true,
        kycStatus: 'pending',
        message: 'No KYC submission found'
      });
    }

    res.json({
      success: true,
      kycStatus: kyc.status,
      submittedAt: kyc.submittedAt,
      verificationTime: kyc.verificationDetails?.verifiedAt,
      documents: kyc.documents,
      verificationDetails: kyc.verificationDetails
    });
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC status'
    });
  }
});

// @route   POST /api/kyc/submit
// @desc    Submit KYC documents
// @access  Private (Providers only)
router.post('/submit', protect, authorize('provider'), upload.fields([
  { name: 'businessLicense', maxCount: 1 },
  { name: 'identityDocument', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'financialStatement', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🔐 KYC Submit: User authenticated:', req.user._id, req.user.email, req.user.role);
    console.log('🔐 KYC Submit: Files received:', req.files ? Object.keys(req.files) : 'No files');
    
    // Check if KYC already exists
    let kyc = await KYC.findByProviderId(req.user._id);
    
    if (!kyc) {
      kyc = new KYC({
        providerId: req.user._id
      });
    }

    // Check if already verified
    if (kyc.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'KYC is already verified'
      });
    }

    // Process uploaded files
    const documents = {};
    const requiredDocs = ['businessLicense', 'identityDocument', 'addressProof'];
    
    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        const file = req.files[fieldName][0];
        documents[fieldName] = {
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        };
      });
    }

    // Validate required documents
    const missingDocs = requiredDocs.filter(doc => !documents[doc]);
    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required documents: ${missingDocs.join(', ')}`
      });
    }

    // Update KYC record
    kyc.documents = documents;
    kyc.status = 'submitted';
    kyc.submittedAt = new Date();
    kyc.lastUpdated = new Date();

    await kyc.save();

    // Update user's KYC status
    await User.findByIdAndUpdate(req.user._id, {
      kycStatus: 'submitted'
    });

    // Simulate verification process (1 minute delay)
    setTimeout(async () => {
      try {
        const updatedKYC = await KYC.findById(kyc._id);
        if (updatedKYC && updatedKYC.status === 'submitted') {
          updatedKYC.status = 'verified';
          updatedKYC.verificationDetails = {
            verifiedBy: req.user._id, // Self-verification for demo
            verifiedAt: new Date(),
            verificationNotes: 'Automatically verified after document submission'
          };
          updatedKYC.lastUpdated = new Date();
          await updatedKYC.save();

          // Update user's KYC status
          await User.findByIdAndUpdate(req.user._id, {
            kycStatus: 'verified'
          });

          console.log(`✅ KYC verified for provider: ${req.user._id}`);
        }
      } catch (verificationError) {
        console.error('Error during automatic verification:', verificationError);
      }
    }, 60000); // 1 minute

    res.json({
      success: true,
      message: 'KYC documents submitted successfully',
      kycId: kyc._id,
      status: kyc.status
    });

  } catch (error) {
    console.error('Error submitting KYC:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting KYC documents'
    });
  }
});

// @route   GET /api/kyc/admin/all
// @desc    Get all KYC submissions (Admin only)
// @access  Private (Admin only)
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    
    const skip = (page - 1) * limit;
    
    const kycSubmissions = await KYC.find(filter)
      .populate('providerId', 'profile.firstName profile.lastName profile.companyName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await KYC.countDocuments(filter);
    
    res.json({
      success: true,
      data: kycSubmissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSubmissions: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching KYC submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC submissions'
    });
  }
});

// @route   PUT /api/kyc/admin/:kycId/verify
// @desc    Verify KYC submission (Admin only)
// @access  Private (Admin only)
router.put('/admin/:kycId/verify', protect, authorize('admin'), async (req, res) => {
  try {
    const { kycId } = req.params;
    const { notes } = req.body;
    
    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC submission not found'
      });
    }
    
    await kyc.markAsVerified(req.user._id, notes);
    
    // Update user's KYC status
    await User.findByIdAndUpdate(kyc.providerId, {
      kycStatus: 'verified'
    });
    
    res.json({
      success: true,
      message: 'KYC verified successfully',
      kyc: kyc
    });
  } catch (error) {
    console.error('Error verifying KYC:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying KYC'
    });
  }
});

// @route   PUT /api/kyc/admin/:kycId/reject
// @desc    Reject KYC submission (Admin only)
// @access  Private (Admin only)
router.put('/admin/:kycId/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { kycId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC submission not found'
      });
    }
    
    await kyc.markAsRejected(reason, req.user._id);
    
    // Update user's KYC status
    await User.findByIdAndUpdate(kyc.providerId, {
      kycStatus: 'rejected'
    });
    
    res.json({
      success: true,
      message: 'KYC rejected successfully',
      kyc: kyc
    });
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting KYC'
    });
  }
});

// @route   GET /api/kyc/stats
// @desc    Get KYC statistics
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [pending, submitted, verified, rejected] = await Promise.all([
      KYC.getPendingCount(),
      KYC.getSubmittedCount(),
      KYC.countDocuments({ status: 'verified' }),
      KYC.countDocuments({ status: 'rejected' })
    ]);
    
    res.json({
      success: true,
      stats: {
        pending,
        submitted,
        verified,
        rejected,
        total: pending + submitted + verified + rejected
      }
    });
  } catch (error) {
    console.error('Error fetching KYC stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching KYC statistics'
    });
  }
});

module.exports = router;
