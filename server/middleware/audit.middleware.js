const AuditLog = require('../models/AuditLog.model');

const logAction = (action) => {
  return async (req, res, next) => {
    // Let the route handler run first
    res.on('finish', async () => {
      if (res.statusCode < 400) { // Log only successful actions
        try {
          const log = new AuditLog({
            userId: req.user ? req.user.id : null,
            action,
            details: {
              route: req.originalUrl,
              method: req.method,
              params: req.params,
              body: req.body, // Be careful not to log sensitive data like passwords
              responseStatus: res.statusCode,
              responseTime: Date.now() - req.startTime
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session ? req.session.id : null,
            resourceType: getResourceType(req.originalUrl),
            resourceId: req.params.id || req.body.id
          });
          await log.save();
        } catch (error) {
          console.error('Error logging action:', error);
        }
      }
    });
    next();
  };
};

// Helper function to determine resource type from URL
function getResourceType(url) {
  if (url.includes('/users')) return 'user';
  if (url.includes('/requests')) return 'insurance_request';
  if (url.includes('/bids')) return 'bid';
  if (url.includes('/payments')) return 'payment';
  if (url.includes('/documents')) return 'document';
  if (url.includes('/reviews')) return 'review';
  return 'other';
}

// Middleware to add start time for response time calculation
const addStartTime = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

// Middleware to log security events
const logSecurityEvent = (action, severity = 'medium') => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      try {
        const log = new AuditLog({
          userId: req.user ? req.user.id : null,
          action,
          details: {
            route: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            responseStatus: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          severity,
          outcome: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage: res.statusCode >= 400 ? res.locals.errorMessage : null
        });
        await log.save();
      } catch (error) {
        console.error('Error logging security event:', error);
      }
    });
    next();
  };
};

// Middleware to log failed authentication attempts
const logAuthFailure = (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      try {
        const log = new AuditLog({
          userId: req.user ? req.user.id : null,
          action: 'authentication_failure',
          details: {
            route: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            responseStatus: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          severity: 'high',
          outcome: 'failure',
          errorMessage: 'Authentication failed'
        });
        await log.save();
      } catch (error) {
        console.error('Error logging auth failure:', error);
      }
    }
    next();
  });
};

module.exports = { 
  logAction, 
  addStartTime, 
  logSecurityEvent, 
  logAuthFailure 
};





