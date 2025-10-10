// src/services/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

/**
 * Authentication Service - Pure SQL & auth logic
 */
class AuthService {

  /**
   * Register a new user
   */
  static async registerUser({ displayName, email, password, firstName, lastName, phone }) {
    // Check if user exists
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, display_name, phone, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, TRUE)`,
      [email, hash, firstName || null, lastName || null, displayName, phone || null]
    );

    return { userId: result.insertId };
  }

  /**
   * Login user
   */
  static async loginUser(email, password) {
    const [rows] = await db.query(
      `SELECT id, email, password_hash, display_name, first_name, last_name, role_id, is_active
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      throw new Error('Invalid email or password');
    }

    const user = rows[0];
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = jwt.sign({ uid: user.id, role: user.role_id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id
      }
    };
  }

  /**
   * Register admin user
   */
  static async registerAdmin({ name, email, password }) {
    // Check if user exists
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create admin user (role_id = 2)
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, display_name, role_id, is_active)
       VALUES (?, ?, ?, 2, TRUE)`,
      [email, hash, name]
    );

    // Generate token
    const token = jwt.sign({ uid: result.insertId, role: 2 }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      admin: {
        _id: result.insertId,  // Use _id for frontend compatibility
        id: result.insertId,
        name,
        email,
        role: 2,
        image: null  // New admins won't have image initially
      }
    };
  }

  /**
   * Login admin user
   */
  static async loginAdmin(email, password) {
    const [rows] = await db.query(
      `SELECT id, email, password_hash, display_name, role_id, is_active
       FROM users WHERE email = ? AND role_id = 2 LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      throw new Error('Invalid email or password');
    }

    const admin = rows[0];
    if (!admin.is_active) {
      throw new Error('Account is inactive');
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = jwt.sign({ uid: admin.id, role: admin.role_id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      admin: {
        _id: admin.id,  // Use _id for frontend compatibility
        id: admin.id,
        name: admin.display_name,
        email: admin.email,
        role: admin.role_id,
        image: null  // Set to null since no image column exists
      }
    };
  }

  /**
   * Update user account
   */
  static async updateAccount(email, { firstName, lastName, displayName, phone }) {
    const [result] = await db.query(
      `UPDATE users 
       SET first_name = ?, last_name = ?, display_name = ?, phone = ?, updated_at = NOW() 
       WHERE email = ?`,
      [firstName || null, lastName || null, displayName, phone || null, email]
    );

    return result.affectedRows > 0;
  }

  /**
   * Update user password
   */
  static async updatePassword(email, currentPassword, newPassword) {
    const [rows] = await db.query('SELECT id, password_hash FROM users WHERE email = ?', [email]);
    
    if (!rows.length) {
      throw new Error('User not found');
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, user.id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Reset password (admin)
   */
  static async resetAdminPassword(email, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    
    const [result] = await db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ? AND role_id = 2',
      [hash, email]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get all staff members
   */
  static async getAllStaff() {
    const [rows] = await db.query(
      `SELECT id, email, display_name, first_name, last_name, phone, is_active, created_at
       FROM users WHERE role_id = 2 ORDER BY created_at DESC`
    );

    return rows;
  }

  /**
   * Add staff member
   */
  static async addStaff({ name, email, password }) {
    // Check if user exists
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) {
      throw new Error('Email already exists');
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, display_name, role_id, is_active)
       VALUES (?, ?, ?, 2, TRUE)`,
      [email, hash, name]
    );

    return { staffId: result.insertId };
  }

  /**
   * Update staff member
   */
  static async updateStaff(id, { name, email }) {
    const [result] = await db.query(
      'UPDATE users SET display_name = ?, email = ?, updated_at = NOW() WHERE id = ? AND role_id = 2',
      [name, email, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Update staff status
   */
  static async updateStaffStatus(id, isActive) {
    const [result] = await db.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ? AND role_id = 2',
      [isActive, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Delete staff member
   */
  static async deleteStaff(id) {
    const [result] = await db.query(
      'DELETE FROM users WHERE id = ? AND role_id = 2',
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id) {
    const [rows] = await db.query(
      `SELECT id, email, display_name, first_name, last_name, role_id, is_active, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    return rows.length ? rows[0] : null;
  }
}

module.exports = AuthService;