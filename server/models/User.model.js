const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['client', 'provider', 'admin'],
    default: 'client'
  },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    companyName: { type: String }, // For providers
    expertise: [{ type: String }], // For providers: ['health', 'auto', 'life', 'property']
    avgRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratings: [{
      raterId: { type: Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    bio: { type: String },
    location: { type: String },
    website: { type: String },
    socialMedia: {
      linkedin: { type: String },
      twitter: { type: String }
    }
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocuments: [{
    type: { type: String, enum: ['id_proof', 'address_proof', 'business_license', 'insurance_license'] },
    filename: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  emailVerificationToken: { type: String },
  emailVerified: { type: Boolean, default: false },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  // Account security fields
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date },
  lastFailedLogin: { type: Date },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, kycStatus: 1 });
userSchema.index({ 'profile.expertise': 1 });
userSchema.index({ 'profile.avgRating': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.methods.getFullName = function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
};

// Check if user is verified provider
userSchema.methods.isVerifiedProvider = function() {
  return this.role === 'provider' && this.kycStatus === 'verified';
};

// Check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (!this.accountLockedUntil) return false;
  return new Date() < this.accountLockedUntil;
};

// Record failed login attempt
userSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = new Date();
  
  // Lock account after 5 failed attempts for 15 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  
  return this.save();
};

// Reset failed login attempts on successful login
userSchema.methods.resetFailedLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  this.lastFailedLogin = null;
  return this.save();
};

// Update average rating
userSchema.methods.updateAverageRating = function() {
  if (this.profile.ratings.length === 0) {
    this.profile.avgRating = 0;
    this.profile.totalReviews = 0;
  } else {
    const totalRating = this.profile.ratings.reduce((acc, r) => acc + r.rating, 0);
    this.profile.avgRating = totalRating / this.profile.ratings.length;
    this.profile.totalReviews = this.profile.ratings.length;
  }
};

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  if (this.role === 'provider' && this.profile.companyName) {
    return this.profile.companyName;
  }
  return this.getFullName();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
