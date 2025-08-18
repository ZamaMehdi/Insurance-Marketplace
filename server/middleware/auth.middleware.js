const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { logSecurityEvent } = require('./audit.middleware');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  console.log('🔐 Protect Middleware: Headers:', req.headers);
  console.log('🔐 Protect Middleware: Authorization header:', req.headers.authorization);

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('🔐 Protect Middleware: Token extracted:', token ? 'Present' : 'Missing');
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({ 
      message: 'Not authorized to access this route',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Add user to request object
    req.user = user;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({ 
      message: 'Not authorized to access this route',
      code: 'AUTH_ERROR'
    });
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('🔐 Authorize Middleware: User:', req.user ? req.user._id : 'No user');
    console.log('🔐 Authorize Middleware: User role:', req.user ? req.user.role : 'No role');
    console.log('🔐 Authorize Middleware: Required roles:', roles);
    
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this route`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    console.log('🔐 Authorize Middleware: Authorization successful');
    next();
  };
};

// Check if user is verified provider
const requireVerifiedProvider = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'User not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'provider') {
    return res.status(403).json({ 
      message: 'Only insurance providers can access this route',
      code: 'PROVIDER_ONLY'
    });
  }

  if (req.user.kycStatus !== 'verified') {
    return res.status(403).json({ 
      message: 'KYC verification required to access this route',
      code: 'KYC_REQUIRED'
    });
  }

  next();
};

// Check if user owns the resource or is admin
const requireOwnership = (resourceModel, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdField];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ 
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const ownerField = resource.clientId ? 'clientId' : 'userId';
      if (resource[ownerField].toString() !== req.user.id.toString()) {
        return res.status(403).json({ 
          message: 'Not authorized to access this resource',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        message: 'Error checking resource ownership',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

// Rate limiting for authentication attempts
const authRateLimit = (req, res, next) => {
  // This would typically be implemented with a rate limiting library
  // For now, we'll just pass through
  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Optional auth failed:', error.message);
      }
    }
  }

  next();
};

module.exports = {
  protect,
  authorize,
  requireVerifiedProvider,
  requireOwnership,
  authRateLimit,
  optionalAuth
};


