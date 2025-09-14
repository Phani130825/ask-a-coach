import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    // Ensure JWT secret is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured in environment');
      return res.status(500).json({ error: 'Server misconfiguration: JWT secret not set' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      // Map known JWT errors to 401 responses
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired. Please login again.' });
      }
      if (jwtErr.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token.' });
      }
      // Unknown JWT error
      console.error('Unexpected JWT verification error:', jwtErr);
      return res.status(500).json({ error: 'Internal server error during authentication.' });
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Fallback - should rarely be hit because specific JWT errors are handled above
    console.error('Authentication error (fallback):', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

export const requirePremium = async (req, res, next) => {
  try {
    if (req.user.subscription !== 'premium') {
      return res.status(403).json({ 
        error: 'Premium subscription required for this feature.' 
      });
    }

    // Check if subscription has expired
    if (req.user.subscriptionExpiry && new Date() > req.user.subscriptionExpiry) {
      return res.status(403).json({ 
        error: 'Premium subscription has expired. Please renew to continue.' 
      });
    }

    next();
  } catch (error) {
    console.error('Premium check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during premium check.' 
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we continue without authentication
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};
