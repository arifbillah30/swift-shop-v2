// Backend/src/routes/shop/dashboard.routes.js

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');
const mysql = require('mysql2/promise');

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Mahfuz2003#',
  database: 'swift_shop_db'
};

/**
 * GET /api/v1/user/dashboard/stats
 * Get user dashboard statistics
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get total orders and total spent
      const [orderStats] = await connection.execute(`
        SELECT 
          COUNT(*) as totalOrders,
          COALESCE(SUM(grand_total), 0) as totalSpent
        FROM orders 
        WHERE user_id = ?
      `, [userId]);

      // Get orders by status
      const [statusStats] = await connection.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM orders 
        WHERE user_id = ?
        GROUP BY status
      `, [userId]);

      // Get this month's stats
      const [monthlyStats] = await connection.execute(`
        SELECT 
          COUNT(*) as monthlyOrders,
          COALESCE(SUM(grand_total), 0) as monthlySpent
        FROM orders 
        WHERE user_id = ? 
        AND MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
      `, [userId]);

      // Format status breakdown
      const statusBreakdown = {};
      statusStats.forEach(stat => {
        statusBreakdown[stat.status] = stat.count;
      });

      const stats = {
        totalOrders: orderStats[0]?.totalOrders || 0,
        totalSpent: parseFloat(orderStats[0]?.totalSpent || 0),
        monthlyOrders: monthlyStats[0]?.monthlyOrders || 0,
        monthlySpent: parseFloat(monthlyStats[0]?.monthlySpent || 0),
        statusBreakdown: {
          pending: statusBreakdown.pending || 0,
          processing: statusBreakdown.processing || 0,
          delivered: statusBreakdown.delivered || 0,
          cancelled: statusBreakdown.cancelled || 0,
          ...statusBreakdown
        }
      };

      res.json({
        success: true,
        data: stats
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/user/dashboard/recent-activity
 * Get user's recent activity (orders, cart updates, etc.)
 */
router.get('/recent-activity', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get recent orders
      const [recentOrders] = await connection.execute(`
        SELECT 
          id,
          order_number,
          status,
          grand_total,
          currency,
          created_at,
          'order' as activity_type
        FROM orders 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, limit]);

      // Get recent cart updates (if needed)
      const [recentCartUpdates] = await connection.execute(`
        SELECT 
          c.id,
          c.updated_at,
          COUNT(ci.id) as item_count,
          'cart_update' as activity_type
        FROM carts c
        LEFT JOIN cart_items ci ON c.id = ci.cart_id
        WHERE c.user_id = ?
        GROUP BY c.id, c.updated_at
        ORDER BY c.updated_at DESC
        LIMIT 5
      `, [userId]);

      // Combine and sort activities
      const activities = [
        ...recentOrders.map(order => ({
          ...order,
          created_at: order.created_at,
          activity_type: 'order'
        })),
        ...recentCartUpdates.map(cart => ({
          ...cart,
          created_at: cart.updated_at,
          activity_type: 'cart_update'
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
       .slice(0, limit);

      res.json({
        success: true,
        data: {
          activities,
          total: activities.length
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/user/dashboard/summary
 * Get comprehensive dashboard summary
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get user profile info
      const [userInfo] = await connection.execute(`
        SELECT 
          id,
          email,
          displayName,
          firstName,
          lastName,
          phone,
          created_at,
          updated_at
        FROM users 
        WHERE id = ?
      `, [userId]);

      // Get order statistics
      const [orderStats] = await connection.execute(`
        SELECT 
          COUNT(*) as totalOrders,
          COALESCE(SUM(grand_total), 0) as totalSpent,
          COALESCE(AVG(grand_total), 0) as averageOrderValue
        FROM orders 
        WHERE user_id = ?
      `, [userId]);

      // Get current cart info
      const [cartInfo] = await connection.execute(`
        SELECT 
          c.id,
          COUNT(ci.id) as totalItems,
          COALESCE(SUM(ci.quantity * ci.unit_price), 0) as cartTotal
        FROM carts c
        LEFT JOIN cart_items ci ON c.id = ci.cart_id
        WHERE c.user_id = ?
        GROUP BY c.id
      `, [userId]);

      // Get favorite categories (based on order history)
      const [favoriteCategories] = await connection.execute(`
        SELECT 
          p.category,
          COUNT(*) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = ?
        GROUP BY p.category
        ORDER BY order_count DESC
        LIMIT 5
      `, [userId]);

      const summary = {
        user: userInfo[0] || null,
        orders: {
          total: orderStats[0]?.totalOrders || 0,
          totalSpent: parseFloat(orderStats[0]?.totalSpent || 0),
          averageOrderValue: parseFloat(orderStats[0]?.averageOrderValue || 0)
        },
        cart: {
          totalItems: cartInfo[0]?.totalItems || 0,
          cartTotal: parseFloat(cartInfo[0]?.cartTotal || 0)
        },
        favoriteCategories: favoriteCategories || []
      };

      res.json({
        success: true,
        data: summary
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: error.message
    });
  }
});

module.exports = router;