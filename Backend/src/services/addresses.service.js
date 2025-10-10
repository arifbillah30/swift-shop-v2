// src/services/addresses.service.js
const db = require('../lib/db');

class AddressesService {
  /**
   * Find user ID by email
   */
  static async getUserIdByEmail(email) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const [rows] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    return rows[0]?.id || null;
  }

  /**
   * Get all addresses for a user
   */
  static async getUserAddresses(userId) {
    const [rows] = await db.query(
      `SELECT id, user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default, created_at
       FROM addresses
       WHERE user_id = ?
       ORDER BY (address_type='shipping') DESC, is_default DESC, id DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Get address by user ID and type
   */
  static async getAddressByType(userId, type) {
    const [rows] = await db.query(
      `SELECT id, user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default, created_at
       FROM addresses
       WHERE user_id = ? AND address_type = ?
       LIMIT 1`,
      [userId, type]
    );
    return rows[0] || null;
  }

  /**
   * Check if address exists by user ID and type
   */
  static async addressExists(userId, type) {
    const [rows] = await db.query(
      'SELECT id FROM addresses WHERE user_id = ? AND address_type = ? LIMIT 1',
      [userId, type]
    );
    return rows.length > 0;
  }

  /**
   * Create new address
   */
  static async createAddress(userId, addressData) {
    const {
      address_type,
      line1,
      line2,
      city,
      state,
      postal_code,
      country_code,
      is_default
    } = addressData;

    const [result] = await db.query(
      `INSERT INTO addresses (user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        address_type,
        line1,
        line2 || null,
        city,
        state || null,
        postal_code || null,
        (country_code || 'BD').toUpperCase(),
        !!is_default
      ]
    );

    return result.insertId;
  }

  /**
   * Update existing address
   */
  static async updateAddress(userId, type, addressData) {
    const {
      line1,
      line2,
      city,
      state,
      postal_code,
      country_code,
      is_default
    } = addressData;

    const [result] = await db.query(
      `UPDATE addresses
       SET line1 = ?, line2 = ?, city = ?, state = ?, postal_code = ?, country_code = ?, is_default = ?
       WHERE user_id = ? AND address_type = ?`,
      [
        line1,
        line2 || null,
        city,
        state || null,
        postal_code || null,
        (country_code || 'BD').toUpperCase(),
        !!is_default,
        userId,
        type
      ]
    );

    return result.affectedRows > 0;
  }

  /**
   * Upsert address (update if exists, create if not)
   */
  static async upsertAddress(userId, type, addressData) {
    const exists = await this.addressExists(userId, type);
    
    if (exists) {
      await this.updateAddress(userId, type, addressData);
    } else {
      await this.createAddress(userId, { ...addressData, address_type: type });
    }

    return this.getAddressByType(userId, type);
  }

  /**
   * Delete address
   */
  static async deleteAddress(userId, type) {
    const [result] = await db.query(
      'DELETE FROM addresses WHERE user_id = ? AND address_type = ?',
      [userId, type]
    );
    return result.affectedRows > 0;
  }

  /**
   * Validate address type
   */
  static isValidAddressType(type) {
    return ['billing', 'shipping', 'other'].includes(type?.toLowerCase());
  }

  /**
   * Normalize email
   */
  static normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }
}

module.exports = AddressesService;