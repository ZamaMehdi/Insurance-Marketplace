const mongoose = require('mongoose');
const { Schema } = mongoose;

const kycSchema = new Schema({
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  documents: {
    businessLicense: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    },
    identityDocument: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    },
    addressProof: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    },
    financialStatement: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    }
  },
  verificationDetails: {
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String,
    rejectionReason: String
  },
  submittedAt: Date,
  lastUpdated: Date
}, {
  timestamps: true
});

// Indexes
kycSchema.index({ providerId: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ submittedAt: -1 });

// Methods
kycSchema.methods.markAsSubmitted = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.lastUpdated = new Date();
  return this.save();
};

kycSchema.methods.markAsVerified = function(verifiedBy, notes = '') {
  this.status = 'verified';
  this.verificationDetails.verifiedBy = verifiedBy;
  this.verificationDetails.verifiedAt = new Date();
  this.verificationDetails.verificationNotes = notes;
  this.lastUpdated = new Date();
  return this.save();
};

kycSchema.methods.markAsRejected = function(reason, rejectedBy) {
  this.status = 'rejected';
  this.verificationDetails.rejectionReason = reason;
  this.verificationDetails.verifiedBy = rejectedBy;
  this.lastUpdated = new Date();
  return this.save();
};

// Static methods
kycSchema.statics.findByProviderId = function(providerId) {
  return this.findOne({ providerId }).populate('providerId', 'profile.firstName profile.lastName profile.companyName email');
};

kycSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('providerId', 'profile.firstName profile.lastName profile.companyName email');
};

kycSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' });
};

kycSchema.statics.getSubmittedCount = function() {
  return this.countDocuments({ status: 'submitted' });
};

module.exports = mongoose.model('KYC', kycSchema);
