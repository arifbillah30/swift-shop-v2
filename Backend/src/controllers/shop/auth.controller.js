// src/controllers/shop/auth.controller.js
const AuthService = require('../../services/auth.service');
const { success, fail, validationError } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Shop Auth Controller - Public authentication endpoints
 */
class ShopAuthController {

  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  static register = asyncHandler(async (req, res) => {
    const { displayName, email, password, firstName, lastName, phone } = req.body;

    if (!displayName || !email || !password) {
      return validationError(res, {
        displayName: !displayName ? 'Display name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
        password: !password ? 'Password is required' : undefined,
      });
    }

    try {
      const { userId } = await AuthService.registerUser({
        displayName,
        email,
        password,
        firstName,
        lastName,
        phone,
      });

      return success(res, { userId }, null, 'User registered successfully');
    } catch (error) {
      if (error.message === 'Email already registered') {
        return fail(res, 409, 'Email already registered');
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/login
   * Login user
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return validationError(res, {
        email: !email ? 'Email is required' : undefined,
        password: !password ? 'Password is required' : undefined,
      });
    }

    try {
      const { token, user } = await AuthService.loginUser(email, password);

      return success(res, { token, user }, null, 'Login successful');
    } catch (error) {
      if (error.message === 'Invalid email or password') {
        return fail(res, 401, 'Invalid email or password');
      }
      if (error.message === 'Account is inactive') {
        return fail(res, 403, 'Account is inactive');
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/auth/update-account
   * Update user account information
   */
  static updateAccount = asyncHandler(async (req, res) => {
    const { email, firstName, lastName, displayName, phone } = req.body;

    if (!email || !displayName) {
      return validationError(res, {
        email: !email ? 'Email is required' : undefined,
        displayName: !displayName ? 'Display name is required' : undefined,
      });
    }

    const updated = await AuthService.updateAccount(email, {
      firstName,
      lastName,
      displayName,
      phone,
    });

    if (!updated) {
      return fail(res, 404, 'User not found');
    }

    return success(res, null, null, 'Account updated successfully');
  });

  /**
   * PUT /api/v1/auth/update-password
   * Update user password
   */
  static updatePassword = asyncHandler(async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return validationError(res, {
        email: !email ? 'Email is required' : undefined,
        currentPassword: !currentPassword ? 'Current password is required' : undefined,
        newPassword: !newPassword ? 'New password is required' : undefined,
      });
    }

    try {
      const updated = await AuthService.updatePassword(
        email.trim().toLowerCase(),
        currentPassword,
        newPassword
      );

      if (!updated) {
        return fail(res, 404, 'User not found');
      }

      return success(res, null, null, 'Password updated successfully');
    } catch (error) {
      if (error.message === 'User not found') {
        return fail(res, 404, 'User not found');
      }
      if (error.message === 'Current password incorrect') {
        return fail(res, 401, 'Current password incorrect');
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/auth/profile
   * Get user profile information
   */
  static getProfile = asyncHandler(async (req, res) => {
    // This endpoint requires authentication middleware
    const userId = req.user?.id;
    
    if (!userId) {
      return fail(res, 401, 'Authentication required');
    }

    try {
      const user = await AuthService.getUserById(userId);
      
      if (!user) {
        return fail(res, 404, 'User not found');
      }

      // Remove sensitive information
      const { password, ...userProfile } = user;

      return success(res, { user: userProfile }, null, 'Profile retrieved successfully');
    } catch (error) {
      throw error;
    }
  });

}

module.exports = ShopAuthController;