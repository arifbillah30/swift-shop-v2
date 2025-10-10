// src/services/orders.service.js
const db = require('../lib/db');

class OrdersService {
  /**
   * Get all orders
   */
  static async getAllOrders() {
    const [rows] = await db.query(`
      SELECT 
        o.*,
        u.email as user_email,
        u.display_name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    return rows;
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId) {
    const [rows] = await db.query(`
      SELECT 
        o.*,
        u.email as user_email,
        u.display_name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      LIMIT 1
    `, [orderId]);
    return rows[0] || null;
  }

  /**
   * Update order
   */
  static async updateOrder(orderId, orderData) {
    const fields = [];
    const values = [];

    // Build dynamic update query based on provided fields
    if (orderData.productName !== undefined) {
      fields.push('productName = ?');
      values.push(orderData.productName);
    }
    if (orderData.productPrice !== undefined) {
      fields.push('productPrice = ?');
      values.push(orderData.productPrice);
    }
    if (orderData.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(orderData.quantity);
    }
    if (orderData.paymentMethod !== undefined) {
      fields.push('paymentMethod = ?');
      values.push(orderData.paymentMethod);
    }
    if (orderData.status !== undefined) {
      fields.push('status = ?');
      values.push(orderData.status);
    }

    if (fields.length === 0) {
      throw new Error('No valid fields provided for update');
    }

    fields.push('updated_at = NOW()');
    values.push(orderId);

    const [result] = await db.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, status) {
    const [result] = await db.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get orders by user ID
   */
  static async getOrdersByUserId(userId) {
    const [rows] = await db.query(`
      SELECT o.*
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);
    return rows;
  }

  /**
   * Get orders by status
   */
  static async getOrdersByStatus(status) {
    const [rows] = await db.query(`
      SELECT 
        o.*,
        u.email as user_email,
        u.display_name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status = ?
      ORDER BY o.created_at DESC
    `, [status]);
    return rows;
  }

  /**
   * Delete order
   */
  static async deleteOrder(orderId) {
    const [result] = await db.query('DELETE FROM orders WHERE id = ?', [orderId]);
    return result.affectedRows > 0;
  }

  /**
   * Get order statistics
   */
  static async getOrderStatistics() {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
      FROM orders
    `);
    return stats[0];
  }

  /**
   * Validate order status
   */
  static isValidStatus(status) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
    return validStatuses.includes(status?.toLowerCase());
  }
}

module.exports = OrdersService;