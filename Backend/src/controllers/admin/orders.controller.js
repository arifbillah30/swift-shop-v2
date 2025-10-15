// src/controllers/admin/orders.controller.js
const db = require('../../lib/db');
const { createNotFoundError } = require('../../lib/errors');

class AdminOrdersController {
  /**
   * GET /api/v1/admin/orders/test
   * Simple test endpoint for admin orders
   */
  static async testOrders(req, res, next) {
    try {
      // Simple query to test basic functionality
      const [orders] = await db.query(`
        SELECT 
          o.id,
          o.id as _id,
          o.order_number,
          o.order_number as invoice,
          o.status,
          o.payment_method,
          o.payment_method as paymentMethod,
          o.grand_total,
          o.grand_total as total,
          o.created_at,
          o.updated_at,
          u.first_name,
          u.last_name,
          u.email,
          CONCAT(u.first_name, ' ', u.last_name) as customer_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `);

      // Add user_info for frontend compatibility and normalize data
      orders.forEach(order => {
        // Normalize payment method
        let normalizedPaymentMethod = order.payment_method;
        if (order.payment_method) {
          const method = order.payment_method.toLowerCase();
          if (method.includes('cash')) {
            normalizedPaymentMethod = 'Cash';
          } else if (method.includes('card') || method.includes('credit card')) {
            normalizedPaymentMethod = 'Card';
          } else if (method.includes('credit')) {
            normalizedPaymentMethod = 'Credit';
          }
        }
        order.paymentMethod = normalizedPaymentMethod;
        order.payment_method = normalizedPaymentMethod;
        
        // Format dates
        order.createdAt = new Date(order.created_at).toISOString();
        order.updatedAt = new Date(order.updated_at).toISOString();
        order.updatedDate = new Date(order.updated_at).toISOString();
        
        order.user_info = {
          name: order.customer_name,
          email: order.email
        };
      });

      // Format response to match frontend expectations
      res.json({
        success: true,
        orders: orders, // Frontend expects data.orders
        totalDoc: orders.length,
        message: 'Test endpoint working'
      });
    } catch (error) {
      console.error('Test orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching test orders',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/orders
   * Get all orders for admin with filtering and pagination
   */
  static async getAllOrders(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        customerName,
        startDate,
        endDate,
        day
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = [];
      let queryParams = [];

      // Build WHERE conditions
      if (status && status !== '') {
        whereConditions.push('o.status = ?');
        queryParams.push(status);
      }

      if (customerName && customerName !== '') {
        whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
        const searchTerm = `%${customerName}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (startDate && endDate) {
        whereConditions.push('DATE(o.created_at) BETWEEN ? AND ?');
        queryParams.push(startDate, endDate);
      } else if (day && day !== '') {
        const daysAgo = parseInt(day);
        whereConditions.push('o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        queryParams.push(daysAgo);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Count total orders
      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause}
      `;
      
      const [countResult] = await db.query(countQuery, queryParams);
      const totalOrders = countResult[0].total;

      // Get orders with pagination
      const ordersQuery = `
        SELECT 
          o.id,
          o.id as _id,
          o.order_number,
          o.order_number as invoice,
          o.status,
          o.payment_status,
          o.payment_method,
          o.payment_method as paymentMethod,
          o.subtotal,
          o.tax_total,
          o.shipping_total,
          o.discount_total,
          o.grand_total,
          o.grand_total as total,
          o.currency,
          o.created_at,
          o.created_at as createdAt,
          o.updated_at,
          o.updated_at as updatedAt,
          o.updated_at as updatedDate,
          o.placed_at,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          CONCAT(u.first_name, ' ', u.last_name) as user_info_name,
          oa.full_name as shipping_name,
          oa.line1 as shipping_address,
          oa.city as shipping_city,
          oa.state as shipping_state,
          oa.postal_code as shipping_postal,
          oa.country_code as shipping_country,
          oa.phone as shipping_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_addresses oa ON o.id = oa.order_id AND oa.address_type = 'shipping'
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `;

      queryParams.push(parseInt(limit), offset);
      const [orders] = await db.query(ordersQuery, queryParams);

      // Get order items for each order and normalize data
      for (let order of orders) {
        // Normalize payment method
        let normalizedPaymentMethod = order.payment_method;
        if (order.payment_method) {
          const method = order.payment_method.toLowerCase();
          if (method.includes('cash')) {
            normalizedPaymentMethod = 'Cash';
          } else if (method.includes('card') || method.includes('credit card')) {
            normalizedPaymentMethod = 'Card';
          } else if (method.includes('credit')) {
            normalizedPaymentMethod = 'Credit';
          }
        }
        order.paymentMethod = normalizedPaymentMethod;
        order.payment_method = normalizedPaymentMethod;
        
        // Format dates as ISO strings
        order.createdAt = new Date(order.created_at).toISOString();
        order.updatedAt = new Date(order.updated_at).toISOString();
        order.updatedDate = new Date(order.updated_at).toISOString();
        
        const [items] = await db.query(`
          SELECT 
            oi.id,
            oi.product_id,
            oi.variant_id,
            oi.product_name_snapshot,
            oi.unit_price,
            oi.quantity,
            p.name as current_product_name,
            pv.sku as variant_sku,
            pv.color,
            pv.size
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          LEFT JOIN product_variants pv ON oi.variant_id = pv.id
          WHERE oi.order_id = ?
        `, [order.id]);
        
        order.items = items;
        order.customer_name = order.first_name && order.last_name 
          ? `${order.first_name} ${order.last_name}` 
          : order.email;
        
        // Add user_info object for frontend compatibility
        order.user_info = {
          name: order.customer_name,
          email: order.email
        };
      }

      const totalPages = Math.ceil(totalOrders / parseInt(limit));

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: totalOrders,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching admin orders:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/orders/:id
   * Get single order details for admin
   */
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;

      // Get order details
      const [orders] = await db.query(`
        SELECT 
          o.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone as user_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [id]);

      if (orders.length === 0) {
        throw createNotFoundError('Order not found');
      }

      const order = orders[0];

      // Get order addresses
      const [addresses] = await db.query(`
        SELECT * FROM order_addresses WHERE order_id = ?
      `, [id]);

      // Get order items
      const [items] = await db.query(`
        SELECT 
          oi.*,
          p.name as current_product_name,
          p.image as product_image,
          pv.sku as variant_sku,
          pv.color,
          pv.size
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = ?
      `, [id]);

      // Organize addresses by address_type
      const orderAddresses = {};
      addresses.forEach(addr => {
        orderAddresses[addr.address_type + '_address'] = addr;
      });

      const orderDetail = {
        ...order,
        ...orderAddresses,
        items,
        customer_name: order.first_name && order.last_name 
          ? `${order.first_name} ${order.last_name}` 
          : order.email
      };

      res.json({
        success: true,
        data: orderDetail
      });

    } catch (error) {
      console.error('Error fetching order details:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/orders/:id/status
   * Update order status
   */
  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user.id;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      // Validate and normalize status
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      const normalizedStatus = status.toLowerCase().trim();
      
      // Handle common variations
      let finalStatus = normalizedStatus;
      if (normalizedStatus === 'cancel') {
        finalStatus = 'cancelled';
      } else if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
        });
      }

      // Check if order exists
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (orders.length === 0) {
        throw createNotFoundError('Order not found');
      }

      // Update order status
      await db.query(`
        UPDATE orders 
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `, [finalStatus, id]);

      // Log the status change (optional - you can create an order_status_history table)
      // For now, we'll just return success

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          orderId: id,
          newStatus: finalStatus,
          updatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error updating order status:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/orders/:id
   * Update order details
   */
  static async updateOrder(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const adminId = req.user.id;

      // Check if order exists
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (orders.length === 0) {
        throw createNotFoundError('Order not found');
      }

      // Validate and normalize status if provided
      if (updateData.status) {
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        const normalizedStatus = updateData.status.toLowerCase().trim();
        
        // Handle common variations
        if (normalizedStatus === 'cancel') {
          updateData.status = 'cancelled';
        } else if (!validStatuses.includes(normalizedStatus)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
          });
        } else {
          updateData.status = normalizedStatus;
        }
      }

      // Validate payment_status if provided
      if (updateData.payment_status) {
        const validPaymentStatuses = ['unpaid', 'paid', 'refunded', 'partial_refund'];
        const normalizedPaymentStatus = updateData.payment_status.toLowerCase().trim();
        
        if (!validPaymentStatuses.includes(normalizedPaymentStatus)) {
          return res.status(400).json({
            success: false,
            message: `Invalid payment status. Allowed values: ${validPaymentStatuses.join(', ')}`
          });
        }
        updateData.payment_status = normalizedPaymentStatus;
      }

      // Build update query dynamically
      const allowedFields = [
        'status', 'payment_status', 'payment_method', 
        'subtotal', 'tax_total', 'shipping_total', 
        'discount_total', 'grand_total', 'notes'
      ];
      
      const updateFields = [];
      const updateValues = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await db.query(`
        UPDATE orders 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      res.json({
        success: true,
        message: 'Order updated successfully'
      });

    } catch (error) {
      console.error('Error updating order:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/orders/:id
   * Delete an order (admin only)
   */
  static async deleteOrder(req, res, next) {
    try {
      const { id } = req.params;

      // Check if order exists
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (orders.length === 0) {
        throw createNotFoundError('Order not found');
      }

      await db.query('START TRANSACTION');

      try {
        // Delete order items first
        await db.query('DELETE FROM order_items WHERE order_id = ?', [id]);
        
        // Delete order addresses
        await db.query('DELETE FROM order_addresses WHERE order_id = ?', [id]);
        
        // Delete order coupons if any
        await db.query('DELETE FROM order_coupons WHERE order_id = ?', [id]);
        
        // Finally delete the order
        await db.query('DELETE FROM orders WHERE id = ?', [id]);

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Order deleted successfully'
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error deleting order:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/orders/dashboard/stats
   * Get dashboard statistics
   */
  static async getDashboardStats(req, res, next) {
    try {
      const { page = 1, limit = 8 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get all orders with details for frontend processing
      const [ordersData] = await db.query(`
        SELECT 
          o.id,
          o.id as _id,
          o.order_number,
          o.order_number as invoice,
          o.status,
          o.payment_status,
          o.payment_method,
          o.payment_method as paymentMethod,
          o.grand_total,
          o.grand_total as total,
          o.subtotal,
          o.tax_total,
          o.shipping_total,
          o.discount_total,
          o.currency,
          o.created_at,
          o.updated_at,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as customer_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);

      // Normalize payment methods and format dates for frontend compatibility
      ordersData.forEach(order => {
        // Normalize payment method to match frontend expectations
        let normalizedPaymentMethod = order.payment_method;
        if (order.payment_method) {
          const method = order.payment_method.toLowerCase();
          if (method.includes('cash')) {
            normalizedPaymentMethod = 'Cash';
          } else if (method.includes('card') || method.includes('credit card')) {
            normalizedPaymentMethod = 'Card';
          } else if (method.includes('credit')) {
            normalizedPaymentMethod = 'Credit';
          }
        }
        
        order.paymentMethod = normalizedPaymentMethod;
        order.payment_method = normalizedPaymentMethod;
        
        // Format dates as ISO strings for proper parsing
        order.createdAt = new Date(order.created_at).toISOString();
        order.updatedAt = new Date(order.updated_at).toISOString();
        
        // Ensure total is a number
        order.total = parseFloat(order.total) || 0;
        
        // Add user_info
        order.user_info = {
          name: order.customer_name.trim() || order.email,
          email: order.email
        };
      });

      // Get total order count
      const totalOrder = ordersData.length;

      // Calculate total amount
      const totalAmount = ordersData.reduce((sum, order) => sum + order.total, 0);

      // Calculate this month's order amount
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthlyOrderAmount = ordersData
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, order) => sum + order.total, 0);

      // Get status-wise order counts
      const pendingOrders = ordersData.filter(o => o.status === 'pending');
      const totalPendingOrder = {
        count: pendingOrders.length,
        total: pendingOrders.reduce((sum, order) => sum + order.total, 0)
      };

      const processingOrders = ordersData.filter(o => o.status === 'processing');
      const totalProcessingOrder = processingOrders.length;

      const deliveredOrders = ordersData.filter(o => o.status === 'delivered');
      const totalDeliveredOrder = deliveredOrders.length;

      // Get recent orders with pagination
      const orders = ordersData.slice(offset, offset + parseInt(limit));

      // Get order items for recent orders
      for (let order of orders) {
        const [items] = await db.query(`
          SELECT 
            oi.id,
            oi.product_id,
            oi.variant_id,
            oi.product_name_snapshot,
            oi.unit_price,
            oi.quantity,
            oi.line_total,
            p.name as current_product_name,
            pv.sku as variant_sku,
            pv.color,
            pv.size
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          LEFT JOIN product_variants pv ON oi.variant_id = pv.id
          WHERE oi.order_id = ?
        `, [order.id]);
        
        order.cart = items; // Frontend expects 'cart' field for order items
      }

      res.json({
        success: true,
        orders: orders,
        totalOrder: totalOrder,
        ordersData: ordersData, // All orders for dashboard calculations
        totalAmount: totalAmount,
        thisMonthlyOrderAmount: thisMonthlyOrderAmount,
        totalPendingOrder: totalPendingOrder,
        totalProcessingOrder: totalProcessingOrder,
        totalDeliveredOrder: totalDeliveredOrder
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      next(error);
    }
  }
}

module.exports = AdminOrdersController;