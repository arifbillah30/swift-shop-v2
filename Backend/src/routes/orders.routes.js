// src/routes/orders.routes.js
const express = require('express');
const OrdersController = require('../controllers/orders.controller');

const router = express.Router();

// GET /all-orders - Get all orders (admin)
router.get('/all-orders', OrdersController.getAllOrders);

// GET /get-orders/:id - Get single order by ID
router.get('/get-orders/:id', OrdersController.getOrderById);

// PUT /update-orders/:id - Update an existing order
router.put('/update-orders/:id', OrdersController.updateOrder);

// PUT /update-orders/:id/status - Update order status only
router.put('/update-orders/:id/status', OrdersController.updateOrderStatus);

// DELETE /delete-orders/:id - Delete an order
router.delete('/delete-orders/:id', OrdersController.deleteOrder);

// GET /orders-by-status/:status - Get orders by status
router.get('/orders-by-status/:status', OrdersController.getOrdersByStatus);

// GET /orders-statistics - Get order statistics
router.get('/orders-statistics', OrdersController.getOrderStatistics);

module.exports = router;