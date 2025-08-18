const mongoose = require('mongoose');
const { Schema } = mongoose;

const bidSchema = new Schema({
  requestId: {
    type: Schema.Types.ObjectId,
    ref: 'InsuranceRequest',
    required: true
  },
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  coverageDetails: {
    type: String,
    required: true
  },
  terms: {
    type: String,
    required: true
  },
  exclusions: [String],
  inclusions: [String],
  deductible: {
    type: Number,
    default: 0
  },
  coPay: {
    type: Number,
    default: 0
  },
  maxOutOfPocket: {
    type: Number
  },
  waitingPeriod: {
    type: Number, // in days
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'accepted', 'rejected', 'withdrawn', 'expired'],
    default: 'active'
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  clientNotes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  providerNotes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: true }
  }],
  documents: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['proposal', 'terms_sheet', 'certificate', 'other'] },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  validUntil: {
    type: Date,
    required: true
  },
  responseTime: {
    type: Number, // in hours
    default: 24
  },
  features: [{
    name: { type: String, required: true },
    description: { type: String },
    included: { type: Boolean, default: true }
  }],
  rating: {
    score: { type: Number, min: 1, max: 5 },
    review: { type: String },
    reviewedAt: { type: Date }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bidSchema.index({ requestId: 1, status: 1 });
bidSchema.index({ providerId: 1, status: 1 });
bidSchema.index({ amount: 1 });
bidSchema.index({ createdAt: -1 });
bidSchema.index({ validUntil: 1 });
bidSchema.index({ status: 1, validUntil: 1 });

// Virtual for isExpired
bidSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual for isActive
bidSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isExpired;
});

// Virtual for timeRemaining
bidSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'active') return null;
  const now = new Date();
  const remaining = this.validUntil - now;
  return remaining > 0 ? remaining : 0;
});

// Method to check if bid is still valid
bidSchema.methods.isValid = function() {
  return this.status === 'active' && new Date() <= this.validUntil;
};

// Method to accept bid
bidSchema.methods.accept = function() {
  this.status = 'accepted';
  return this.save();
};

// Method to reject bid
bidSchema.methods.reject = function() {
  this.status = 'rejected';
  return this.save();
};

// Method to withdraw bid
bidSchema.methods.withdraw = function() {
  this.status = 'withdrawn';
  return this.save();
};

// Method to expire bid
bidSchema.methods.expire = function() {
  this.status = 'expired';
  return this.save();
};

// Pre-save middleware to set validUntil if not provided
bidSchema.pre('save', function(next) {
  if (!this.validUntil) {
    this.validUntil = new Date();
    this.validUntil.setDate(this.validUntil.getDate() + 30); // Default 30 days validity
  }
  next();
});

// Ensure virtual fields are serialized
bidSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.isExpired = doc.isExpired;
    ret.isActive = doc.isActive;
    ret.timeRemaining = doc.timeRemaining;
    return ret;
  }
});

const Bid = mongoose.model('Bid', bidSchema);
module.exports = Bid;

