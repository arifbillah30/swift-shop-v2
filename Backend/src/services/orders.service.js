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
   * Create a new order
   */
  static async createOrder(orderData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Generate unique order number
      const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Insert order
      const [orderResult] = await connection.query(`
        INSERT INTO orders (
          order_number, user_id, status, payment_status, fulfillment_status,
          payment_method, currency, subtotal, discount_total, tax_total,
          shipping_total, grand_total, placed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        orderNumber,
        orderData.user_id,
        orderData.status || 'pending',
        orderData.payment_status || 'unpaid',
        orderData.fulfillment_status || 'unfulfilled',
        orderData.payment_method || null,
        orderData.currency || 'BDT',
        orderData.subtotal || 0,
        orderData.discount_total || 0,
        orderData.tax_total || 0,
        orderData.shipping_total || 0,
        orderData.grand_total || 0
      ]);

      const orderId = orderResult.insertId;

      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        const itemValues = [];
        const itemPlaceholders = [];

        for (const item of orderData.items) {
          itemPlaceholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?)');
          itemValues.push(
            orderId,
            item.product_id || null,
            item.variant_id || null,
            item.product_name_snapshot || item.product_name || '',
            item.unit_price || 0,
            item.quantity || 1,
            item.front_img_snapshot || null,
            item.back_img_snapshot || null,
            item.reviews_text_snapshot || null
          );
        }

        await connection.query(`
          INSERT INTO order_items (
            order_id, product_id, variant_id, product_name_snapshot,
            unit_price, quantity, front_img_snapshot, back_img_snapshot,
            reviews_text_snapshot
          ) VALUES ${itemPlaceholders.join(', ')}
        `, itemValues);
      }

      // Insert order addresses if provided
      if (orderData.shipping_address) {
        await connection.query(`
          INSERT INTO order_addresses (
            order_id, address_type, full_name, phone, line1, line2,
            city, state, postal_code, country_code
          ) VALUES (?, 'shipping', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          orderData.shipping_address.full_name || null,
          orderData.shipping_address.phone || null,
          orderData.shipping_address.line1 || '',
          orderData.shipping_address.line2 || null,
          orderData.shipping_address.city || '',
          orderData.shipping_address.state || null,
          orderData.shipping_address.postal_code || '',
          orderData.shipping_address.country_code || 'BD'
        ]);
      }

      if (orderData.billing_address && orderData.billing_address !== orderData.shipping_address) {
        await connection.query(`
          INSERT INTO order_addresses (
            order_id, address_type, full_name, phone, line1, line2,
            city, state, postal_code, country_code
          ) VALUES (?, 'billing', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          orderData.billing_address.full_name || null,
          orderData.billing_address.phone || null,
          orderData.billing_address.line1 || '',
          orderData.billing_address.line2 || null,
          orderData.billing_address.city || '',
          orderData.billing_address.state || null,
          orderData.billing_address.postal_code || '',
          orderData.billing_address.country_code || 'BD'
        ]);
      }

      await connection.commit();
      return { orderId, orderNumber };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get order with items and addresses
   */
  static async getOrderWithDetails(orderId) {
    const [orderRows] = await db.query(`
      SELECT 
        o.*,
        u.email as user_email,
        u.display_name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      LIMIT 1
    `, [orderId]);

    if (!orderRows.length) {
      return null;
    }

    const order = orderRows[0];

    // Get order items
    const [itemRows] = await db.query(`
      SELECT 
        oi.*,
        p.name as current_product_name,
        p.slug as product_slug,
        pv.sku as variant_sku,
        pv.color,
        pv.size,
        pv.material,
        pi.url as current_product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [orderId]);

    // Get order addresses
    const [addressRows] = await db.query(`
      SELECT * FROM order_addresses WHERE order_id = ? ORDER BY address_type
    `, [orderId]);

    order.items = itemRows;
    order.addresses = addressRows;
    order.shipping_address = addressRows.find(addr => addr.address_type === 'shipping') || null;
    order.billing_address = addressRows.find(addr => addr.address_type === 'billing') || null;

    return order;
  }

  /**
   * Get user orders by status
   */
  static async getUserOrdersByStatus(userId, status) {
    const [rows] = await db.query(`
      SELECT o.*
      FROM orders o
      WHERE o.user_id = ? AND o.status = ?
      ORDER BY o.created_at DESC
    `, [userId, status]);
    return rows;
  }

  /**
   * Validate order status
   */
  static isValidStatus(status) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    return validStatuses.includes(status?.toLowerCase());
  }
}

module.exports = OrdersService;