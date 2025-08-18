const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  action: { 
    type: String, 
    required: true, 
    enum: ['login', 'bid_submitted', 'deal_finalized', 'kyc_approved', 'kyc_rejected', 'user_created', 'user_updated', 'password_changed', 'payment_processed', 'document_uploaded', 'review_submitted'] 
  },
  details: { 
    type: Object // e.g., { requestId: '...', bidId: '...', amount: 1000 }
  },
  ipAddress: { 
    type: String 
  },
  userAgent: {
    type: String
  },
  sessionId: {
    type: String
  },
  resourceType: {
    type: String,
    enum: ['user', 'insurance_request', 'bid', 'payment', 'document', 'review', 'other']
  },
  resourceId: {
    type: Schema.Types.ObjectId
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  outcome: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Method to log action
auditLogSchema.statics.logAction = function(data) {
  return this.create({
    userId: data.userId,
    action: data.action,
    details: data.details,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    sessionId: data.sessionId,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    severity: data.severity || 'low',
    outcome: data.outcome || 'success',
    errorMessage: data.errorMessage
  });
};

// Method to get user activity
auditLogSchema.statics.getUserActivity = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'profile.firstName profile.lastName email');
};

// Method to get security events
auditLogSchema.statics.getSecurityEvents = function(severity, days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.find({
    severity: { $in: severity },
    createdAt: { $gte: date }
  }).sort({ createdAt: -1 });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;

