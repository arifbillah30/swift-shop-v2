// src/controllers/admin/auth.controller.js
const AuthService = require('../../services/auth.service');
const { success, fail, notFound, validationError } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Admin Auth Controller - Admin authentication and staff management
 */
class AdminAuthController {

  /**
   * POST /api/v1/admin/auth/register
   * Register a new admin
   */
  static register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return validationError(res, {
        name: !name ? 'Name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
        password: !password ? 'Password is required' : undefined,
      });
    }

    try {
      const { token, admin } = await AuthService.registerAdmin({
        name,
        email,
        password,
      });

      return success(res, { token, ...admin }, null, 'Admin registered successfully');
    } catch (error) {
      if (error.message === 'Email already registered') {
        return fail(res, 409, 'Email already registered');
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/admin/auth/login
   * Login admin
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
      const { token, admin } = await AuthService.loginAdmin(email, password);

      return success(res, { token, ...admin }, null, 'Login successful');
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
   * PUT /api/v1/admin/auth/forget-password
   * Initiate password reset
   */
  static forgetPassword = asyncHandler(async (req, res) => {
    const { verifyEmail } = req.body;

    if (!verifyEmail) {
      return validationError(res, { verifyEmail: 'Email is required' });
    }

    // Check if admin exists
    const admin = await AuthService.getUserById(verifyEmail);
    if (!admin || admin.role_id !== 2) {
      return notFound(res, 'Admin');
    }

    // In production, send email with reset token
    return success(res, null, null, 'Password reset instructions sent to your email');
  });

  /**
   * PUT /api/v1/admin/auth/reset-password
   * Reset admin password
   */
  static resetPassword = asyncHandler(async (req, res) => {
    const { email, newPassword, resetToken } = req.body;

    if (!email || !newPassword) {
      return validationError(res, {
        email: !email ? 'Email is required' : undefined,
        newPassword: !newPassword ? 'New password is required' : undefined,
      });
    }

    // In production, verify resetToken here
    const updated = await AuthService.resetAdminPassword(email, newPassword);

    if (!updated) {
      return notFound(res, 'Admin');
    }

    return success(res, null, null, 'Password reset successfully');
  });

  /**
   * GET /api/v1/admin/auth/staff
   * Get all staff members
   */
  static getAllStaff = asyncHandler(async (req, res) => {
    const staff = await AuthService.getAllStaff();
    return success(res, staff, null, 'Staff retrieved successfully');
  });

  /**
   * POST /api/v1/admin/auth/staff
   * Add new staff member
   */
  static addStaff = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return validationError(res, {
        name: !name ? 'Name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
        password: !password ? 'Password is required' : undefined,
      });
    }

    try {
      const { staffId } = await AuthService.addStaff({ name, email, password });

      return success(res, {
        id: staffId,
        name,
        email,
      }, null, 'Staff added successfully');
    } catch (error) {
      if (error.message === 'Email already exists') {
        return fail(res, 409, 'Email already exists');
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/admin/auth/staff/:id
   * Update staff member
   */
  static updateStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name || !email) {
      return validationError(res, {
        name: !name ? 'Name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
      });
    }

    const updated = await AuthService.updateStaff(id, { name, email });

    if (!updated) {
      return notFound(res, 'Staff member');
    }

    return success(res, null, null, 'Staff updated successfully');
  });

  /**
   * PUT /api/v1/admin/auth/staff/:id/status
   * Update staff status
   */
  static updateStaffStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return validationError(res, { is_active: 'Active status is required' });
    }

    const updated = await AuthService.updateStaffStatus(id, is_active);

    if (!updated) {
      return notFound(res, 'Staff member');
    }

    return success(res, null, null, 'Staff status updated successfully');
  });

  /**
   * DELETE /api/v1/admin/auth/staff/:id
   * Delete staff member
   */
  static deleteStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deleted = await AuthService.deleteStaff(id);

    if (!deleted) {
      return notFound(res, 'Staff member');
    }

    return success(res, null, null, 'Staff deleted successfully');
  });

}

module.exports = AdminAuthController;