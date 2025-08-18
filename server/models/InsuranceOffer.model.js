const mongoose = require('mongoose');
const { Schema } = mongoose;

const insuranceOfferSchema = new Schema({
  providerId: {
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
  category: {
    type: String,
    required: true,
    enum: ['health', 'auto', 'life', 'property', 'business', 'travel', 'pet', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  coverageDetails: {
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    deductible: { type: Number },
    coPay: { type: Number },
    maxOutOfPocket: { type: Number }
  },
  terms: {
    duration: { type: String, required: true }, // e.g., "1 year", "6 months"
    waitingPeriod: { type: String },
    exclusions: [String],
    inclusions: [String],
    specialConditions: [String]
  },
  pricing: {
    basePremium: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi-annually', 'annually'],
      default: 'monthly'
    },
    discounts: [{
      type: { type: String }, // e.g., "multi-policy", "loyalty", "group"
      percentage: { type: Number, min: 0, max: 100 }
    }]
  },
  eligibility: {
    minAge: { type: Number },
    maxAge: { type: Number },
    locations: [String], // States/countries where offer is valid
    preExistingConditions: { type: Boolean, default: false },
    healthRequirements: [String],
    occupationRestrictions: [String]
  },
  features: [{
    name: { type: String, required: true },
    description: { type: String },
    included: { type: Boolean, default: true }
  }],
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String, enum: ['brochure', 'policy', 'application', 'other'] }
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'expired', 'archived'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [String],
  viewCount: { type: Number, default: 0 },
  inquiryCount: { type: Number, default: 0 },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  highlights: [String], // Key selling points
  specialOffers: [{
    title: { type: String },
    description: { type: String },
    validUntil: { type: Date },
    discount: { type: Number }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
insuranceOfferSchema.index({ providerId: 1, status: 1 });
insuranceOfferSchema.index({ category: 1, status: 1, isPublic: 1 });
insuranceOfferSchema.index({ 'coverageDetails.minAmount': 1, 'coverageDetails.maxAmount': 1 });
insuranceOfferSchema.index({ tags: 1 });
insuranceOfferSchema.index({ rating: -1 });
insuranceOfferSchema.index({ createdAt: -1 });

// Virtual for coverage range
insuranceOfferSchema.virtual('coverageRange').get(function() {
  if (!this.coverageDetails || !this.coverageDetails.minAmount || !this.coverageDetails.maxAmount) {
    return 'Coverage amount not specified';
  }
  const minAmount = this.coverageDetails.minAmount.toLocaleString ? this.coverageDetails.minAmount.toLocaleString() : this.coverageDetails.minAmount;
  const maxAmount = this.coverageDetails.maxAmount.toLocaleString ? this.coverageDetails.maxAmount.toLocaleString() : this.coverageDetails.maxAmount;
  const currency = this.coverageDetails.currency || 'USD';
  return `${minAmount} - ${maxAmount} ${currency}`;
});

// Virtual for monthly premium
insuranceOfferSchema.virtual('monthlyPremium').get(function() {
  if (!this.pricing || !this.pricing.basePremium) {
    return 0;
  }
  
  if (this.pricing.paymentFrequency === 'monthly') {
    return this.pricing.basePremium;
  } else if (this.pricing.paymentFrequency === 'quarterly') {
    return this.pricing.basePremium / 3;
  } else if (this.pricing.paymentFrequency === 'semi-annually') {
    return this.pricing.basePremium / 6;
  } else if (this.pricing.paymentFrequency === 'annually') {
    return this.pricing.basePremium / 12;
  }
  return this.pricing.basePremium;
});

// Ensure virtual fields are serialized
insuranceOfferSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

const InsuranceOffer = mongoose.model('InsuranceOffer', insuranceOfferSchema);
module.exports = InsuranceOffer;


