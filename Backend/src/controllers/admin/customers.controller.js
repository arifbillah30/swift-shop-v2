// src/controllers/admin/customers.controller.js
const db = require('../../lib/db');
const { createNotFoundError } = require('../../lib/errors');
const bcrypt = require('bcrypt');

class AdminCustomersController {
  /**
   * GET /api/v1/admin/customers or /customer
   * Get all customers with search functionality
   */
  static async getAllCustomers(req, res, next) {
    try {
      const { searchText = '', page = 1, limit = 10 } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = ['u.role_id = 1']; // Only customers (role_id = 1)
      let queryParams = [];

      // Search functionality
      if (searchText && searchText !== '') {
        whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
        const searchTerm = `%${searchText}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Get all customers with order count
      const customersQuery = `
        SELECT 
          u.id,
          u.id as _id,
          u.email,
          u.first_name,
          u.last_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as name,
          u.phone,
          u.display_name,
          u.is_active,
          u.created_at,
          u.created_at as createdAt,
          u.updated_at,
          u.updated_at as updatedAt,
          COUNT(DISTINCT o.id) as totalOrder,
          COALESCE(SUM(o.grand_total), 0) as totalSpent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        ${whereClause}
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.display_name, u.is_active, u.created_at, u.updated_at
        ORDER BY u.created_at DESC
      `;

      const [customers] = await db.query(customersQuery, queryParams);

      // Format dates
      customers.forEach(customer => {
        customer.name = customer.name.trim() || customer.email;
        customer.createdAt = new Date(customer.created_at).toISOString();
        customer.updatedAt = customer.updated_at ? new Date(customer.updated_at).toISOString() : null;
      });

      res.json({
        success: true,
        customers: customers,
        total: customers.length
      });

    } catch (error) {
      console.error('Error fetching customers:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/customers/:id or /customer/:id
   * Get single customer details
   */
  static async getCustomerById(req, res, next) {
    try {
      const { id } = req.params;

      const [customers] = await db.query(`
        SELECT 
          u.id,
          u.id as _id,
          u.email,
          u.first_name,
          u.last_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as name,
          u.phone,
          u.display_name,
          u.is_active,
          u.created_at,
          u.updated_at,
          COUNT(DISTINCT o.id) as totalOrder,
          COALESCE(SUM(o.grand_total), 0) as totalSpent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.id = ? AND u.role_id = 1
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.display_name, u.is_active, u.created_at, u.updated_at
      `, [id]);

      if (customers.length === 0) {
        throw createNotFoundError('Customer not found');
      }

      const customer = customers[0];
      customer.name = customer.name.trim() || customer.email;
      customer.createdAt = new Date(customer.created_at).toISOString();
      customer.updatedAt = customer.updated_at ? new Date(customer.updated_at).toISOString() : null;

      // Get customer addresses
      const [addresses] = await db.query(`
        SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC
      `, [id]);

      customer.addresses = addresses;

      res.json({
        success: true,
        customer: customer
      });

    } catch (error) {
      console.error('Error fetching customer:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/customers/create or /customer/create
   * Create a new customer
   */
  static async createCustomer(req, res, next) {
    try {
      const { email, password, first_name, last_name, phone, display_name } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Check if email already exists
      const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Insert new customer
      const [result] = await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, phone, display_name, role_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      `, [email, password_hash, first_name || null, last_name || null, phone || null, display_name || null]);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        customerId: result.insertId
      });

    } catch (error) {
      console.error('Error creating customer:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/customers/:id or /customer/:id
   * Update customer details
   */
  static async updateCustomer(req, res, next) {
    try {
      const { id } = req.params;
      const { first_name, last_name, phone, display_name, is_active, email } = req.body;

      // Check if customer exists
      const [customers] = await db.query('SELECT * FROM users WHERE id = ? AND role_id = 1', [id]);
      if (customers.length === 0) {
        throw createNotFoundError('Customer not found');
      }

      // If email is being updated, check for duplicates
      if (email && email !== customers[0].email) {
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
        if (existingUsers.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];

      if (first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(first_name);
      }
      if (last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(last_name);
      }
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(phone);
      }
      if (display_name !== undefined) {
        updateFields.push('display_name = ?');
        updateValues.push(display_name);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active ? 1 : 0);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await db.query(`
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      res.json({
        success: true,
        message: 'Customer updated successfully'
      });

    } catch (error) {
      console.error('Error updating customer:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/customers/:id or /customer/:id
   * Delete a customer
   */
  static async deleteCustomer(req, res, next) {
    try {
      const { id } = req.params;

      // Check if customer exists
      const [customers] = await db.query('SELECT * FROM users WHERE id = ? AND role_id = 1', [id]);
      if (customers.length === 0) {
        throw createNotFoundError('Customer not found');
      }

      // Check if customer has orders
      const [orders] = await db.query('SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [id]);
      if (orders[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete customer with existing orders. Consider deactivating instead.'
        });
      }

      // Delete customer
      await db.query('DELETE FROM users WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting customer:', error);
      next(error);
    }
  }

  /**
   * POST /customer/filter/:email
   * Filter customer by email (legacy endpoint)
   */
  static async filterCustomer(req, res, next) {
    try {
      const { email } = req.params;

      const [customers] = await db.query(`
        SELECT 
          u.id,
          u.id as _id,
          u.email,
          u.first_name,
          u.last_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as name,
          u.phone,
          u.display_name,
          u.is_active,
          u.created_at
        FROM users u
        WHERE u.email = ? AND u.role_id = 1
      `, [email]);

      if (customers.length === 0) {
        return res.json({
          success: false,
          message: 'Customer not found'
        });
      }

      const customer = customers[0];
      customer.name = customer.name.trim() || customer.email;

      res.json({
        success: true,
        customer: customer
      });

    } catch (error) {
      console.error('Error filtering customer:', error);
      next(error);
    }
  }
}

module.exports = AdminCustomersController;
