const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportTicketSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  requestId: { 
    type: Schema.Types.ObjectId, 
    ref: 'InsuranceRequest' 
  },
  subject: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'claim', 'general', 'kyc', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'closed'], 
    default: 'open' 
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  messages: [{
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    attachments: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String },
      size: { type: Number }
    }],
    timestamp: { type: Date, default: Date.now }
  }],
  tags: [String],
  resolution: {
    summary: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    satisfaction: { type: Number, min: 1, max: 5 }
  },
  escalationLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  estimatedResolutionTime: {
    type: Date
  },
  isUrgent: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ category: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ lastActivity: -1 });

// Virtual for isOverdue
supportTicketSchema.virtual('isOverdue').get(function() {
  if (this.estimatedResolutionTime && this.status !== 'resolved') {
    return new Date() > this.estimatedResolutionTime;
  }
  return false;
});

// Virtual for responseTime
supportTicketSchema.virtual('responseTime').get(function() {
  if (this.messages.length > 1) {
    const firstResponse = this.messages[1]; // First message after initial description
    return firstResponse.timestamp - this.createdAt;
  }
  return null;
});

// Method to add message
supportTicketSchema.methods.addMessage = function(senderId, text, isInternal = false, attachments = []) {
  this.messages.push({
    senderId,
    text,
    isInternal,
    attachments,
    timestamp: new Date()
  });
  this.lastActivity = new Date();
  return this.save();
};

// Method to assign ticket
supportTicketSchema.methods.assign = function(agentId) {
  this.assignedTo = agentId;
  this.status = 'in_progress';
  this.lastActivity = new Date();
  return this.save();
};

// Method to resolve ticket
supportTicketSchema.methods.resolve = function(resolution, resolvedBy) {
  this.status = 'resolved';
  this.resolution = {
    summary: resolution,
    resolvedBy,
    resolvedAt: new Date()
  };
  this.lastActivity = new Date();
  return this.save();
};

// Method to escalate ticket
supportTicketSchema.methods.escalate = function() {
  if (this.escalationLevel < 3) {
    this.escalationLevel += 1;
    this.priority = 'urgent';
    this.isUrgent = true;
    this.lastActivity = new Date();
  }
  return this.save();
};

// Pre-save middleware to update lastActivity
supportTicketSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Ensure virtual fields are serialized
supportTicketSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.isOverdue = doc.isOverdue;
    ret.responseTime = doc.responseTime;
    return ret;
  }
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
module.exports = SupportTicket;

