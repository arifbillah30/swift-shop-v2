// src/routes/admin/orders.routes.js
const express = require('express');
const AdminOrdersController = require('../../controllers/admin/orders.controller');
const { verifyToken, verifyAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Temporary test endpoint without authentication for debugging
router.get('/test', AdminOrdersController.testOrders);

// Apply admin authentication to all other routes
router.use(verifyToken, verifyAdmin);

// GET /api/v1/admin/orders - Get all orders with filtering
router.get('/', AdminOrdersController.getAllOrders);

// GET /api/v1/admin/orders/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', AdminOrdersController.getDashboardStats);

// GET /api/v1/admin/orders/:id - Get single order details
router.get('/:id', AdminOrdersController.getOrderById);

// PUT /api/v1/admin/orders/:id/status - Update order status
router.put('/:id/status', AdminOrdersController.updateOrderStatus);

// PUT /api/v1/admin/orders/:id - Update order details
router.put('/:id', AdminOrdersController.updateOrder);

// DELETE /api/v1/admin/orders/:id - Delete order
router.delete('/:id', AdminOrdersController.deleteOrder);

module.exports = router;