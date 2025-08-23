import express from 'express';
import User from '../models/User.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, profilePicture } = req.body;

  // Validation
  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: 'First name and last name are required'
    });
  }

  // Update user profile
  const user = await User.findById(req.user._id);
  user.firstName = firstName;
  user.lastName = lastName;
  
  if (profilePicture) {
    user.profilePicture = profilePicture;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', asyncHandler(async (req, res) => {
  const { interviewTypes, notifications, privacy } = req.body;

  const user = await User.findById(req.user._id);

  if (interviewTypes) {
    user.preferences.interviewTypes = interviewTypes;
  }

  if (notifications) {
    user.preferences.notifications = { ...user.preferences.notifications, ...notifications };
  }

  if (privacy) {
    user.preferences.privacy = { ...user.preferences.privacy, ...privacy };
  }

  await user.save();

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences
    }
  });
}));

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long'
    });
  }

  const user = await User.findById(req.user._id);

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('stats preferences');

  res.json({
    success: true,
    data: {
      stats: user.stats,
      preferences: user.preferences
    }
  });
}));

// @route   POST /api/users/subscription
// @desc    Update subscription status
// @access  Private
router.post('/subscription', requirePremium, asyncHandler(async (req, res) => {
  const { subscriptionType, expiryDate } = req.body;

  if (!subscriptionType || !expiryDate) {
    return res.status(400).json({
      success: false,
      error: 'Subscription type and expiry date are required'
    });
  }

  const user = await User.findById(req.user._id);
  user.subscription = subscriptionType;
  user.subscriptionExpiry = new Date(expiryDate);

  await user.save();

  res.json({
    success: true,
    message: 'Subscription updated successfully',
    data: {
      subscription: user.subscription,
      subscriptionExpiry: user.subscriptionExpiry
    }
  });
}));

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required to delete account'
    });
  }

  const user = await User.findById(req.user._id);

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'Password is incorrect'
    });
  }

  // Deactivate account instead of deleting
  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

export default router;
