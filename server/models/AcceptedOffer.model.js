const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AcceptedOfferSchema = new Schema({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'InsuranceOffer',
    required: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverageAmount: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  monthlyPremium: {
    type: Number,
    required: true,
    min: 0
  },
  additionalNotes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'completed'],
    default: 'active'
  },
  acceptedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Virtual for formatted coverage amount
AcceptedOfferSchema.virtual('coverageAmountFormatted').get(function() {
  return this.coverageAmount ? `$${this.coverageAmount.toLocaleString()}` : 'N/A';
});

// Virtual for formatted monthly premium
AcceptedOfferSchema.virtual('monthlyPremiumFormatted').get(function() {
  return this.monthlyPremium ? `$${this.monthlyPremium.toLocaleString()}` : 'N/A';
});

// Virtual for time since acceptance
AcceptedOfferSchema.virtual('timeSinceAcceptance').get(function() {
  if (!this.acceptedAt) return 'N/A';
  
  const now = new Date();
  const diffTime = Math.abs(now - this.acceptedAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
});

// Indexes for efficient querying
AcceptedOfferSchema.index({ clientId: 1, status: 1 });
AcceptedOfferSchema.index({ providerId: 1, status: 1 });
AcceptedOfferSchema.index({ offerId: 1 });
AcceptedOfferSchema.index({ acceptedAt: -1 });

// Ensure virtuals are included when converting to JSON
AcceptedOfferSchema.set('toJSON', { virtuals: true });
AcceptedOfferSchema.set('toObject', { virtuals: true });

const AcceptedOffer = mongoose.model('AcceptedOffer', AcceptedOfferSchema);

module.exports = AcceptedOffer;
