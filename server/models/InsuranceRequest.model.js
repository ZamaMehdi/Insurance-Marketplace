const mongoose = require('mongoose');
const { Schema } = mongoose;

const insuranceRequestSchema = new Schema({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  assetDetails: {
    type: {
      type: String,
      required: true,
      enum: ['property', 'vehicle', 'business', 'health', 'life', 'liability', 'other']
    },
    name: { type: String, required: true },
    value: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    specifications: Schema.Types.Mixed, // Flexible field for asset-specific details
    documents: [{
      name: String,
      url: String,
      type: String
    }]
  },
  insuranceDetails: {
    requestedAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    coverageType: {
      type: String,
      required: true,
      enum: ['full', 'partial', 'group']
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'very-high'],
      default: 'medium'
    },
    exclusions: [String],
    specialRequirements: [String]
  },
  biddingDetails: {
    deadline: { type: Date, required: true },
    minimumBidPercentage: { type: Number, min: 1, max: 100, default: 10 },
    allowPartialBids: { type: Boolean, default: true },
    groupInsuranceAllowed: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['open', 'bidding', 'reviewing', 'awarded', 'closed', 'expired'],
    default: 'open'
  },
  bids: [{
    providerId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    percentage: { type: Number, required: true },
    premium: { type: Number, required: true },
    terms: String,
    conditions: [String],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now },
    responseAt: Date,
    responseNote: String
  }],
  awardedBids: [{
    bidId: { type: Schema.Types.ObjectId },
    providerId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    percentage: Number,
    premium: Number,
    awardedAt: { type: Date, default: Date.now }
  }],
  totalAwardedAmount: { type: Number, default: 0 },
  totalAwardedPercentage: { type: Number, default: 0 },
  isFullyCovered: { type: Boolean, default: false },
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  viewCount: { type: Number, default: 0 },
  bidCount: { type: Number, default: 0 },
  expiresAt: { type: Date },
  isPublic: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes for better query performance
insuranceRequestSchema.index({ clientId: 1, status: 1 });
insuranceRequestSchema.index({ 'assetDetails.type': 1, status: 1 });
insuranceRequestSchema.index({ 'insuranceDetails.requestedAmount': 1 });
insuranceRequestSchema.index({ 'biddingDetails.deadline': 1 });
insuranceRequestSchema.index({ status: 1, isPublic: 1 });
insuranceRequestSchema.index({ tags: 1 });

// Virtual for time remaining
insuranceRequestSchema.virtual('timeRemaining').get(function() {
  if (!this.biddingDetails.deadline) return null;
  const now = new Date();
  const deadline = new Date(this.biddingDetails.deadline);
  const diff = deadline - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
});

// Virtual for coverage percentage
insuranceRequestSchema.virtual('coveragePercentage').get(function() {
  if (this.insuranceDetails.requestedAmount === 0) return 0;
  return Math.round((this.totalAwardedAmount / this.insuranceDetails.requestedAmount) * 100);
});

// Virtual for status display
insuranceRequestSchema.virtual('statusDisplay').get(function() {
  if (this.status === 'open' && this.bidCount > 0) return 'bidding';
  if (this.status === 'bidding' && this.isFullyCovered) return 'fully-covered';
  return this.status;
});

// Ensure virtual fields are serialized
insuranceRequestSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

const InsuranceRequest = mongoose.model('InsuranceRequest', insuranceRequestSchema);
module.exports = InsuranceRequest;

