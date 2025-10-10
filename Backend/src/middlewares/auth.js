// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const db = require('../lib/db');
const { createUnauthorizedError, createForbiddenError } = require('../lib/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

/**
 * Verify JWT token and extract user info
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createUnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user details from database
    const [rows] = await db.query(
      `SELECT id, email, display_name, first_name, last_name, role_id, is_active
       FROM users WHERE id = ? LIMIT 1`,
      [decoded.uid]
    );

    if (!rows.length) {
      throw createUnauthorizedError('Invalid token');
    }

    const user = rows[0];
    if (!user.is_active) {
      throw createForbiddenError('Account is inactive');
    }

    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: user.role_id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createUnauthorizedError('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createUnauthorizedError('Token expired'));
    }
    next(error);
  }
};

/**
 * Verify admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }

    // Check if user has admin role (assuming role_id 2 is admin)
    if (req.user.roleId !== 2) {
      throw createForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth - sets user if token is valid but doesn't fail if missing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user details from database
    const [rows] = await db.query(
      `SELECT id, email, display_name, first_name, last_name, role_id, is_active
       FROM users WHERE id = ? LIMIT 1`,
      [decoded.uid]
    );

    if (rows.length && rows[0].is_active) {
      const user = rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id
      };
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  optionalAuth
};