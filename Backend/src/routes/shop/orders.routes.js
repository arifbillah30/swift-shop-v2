// src/routes/shop/orders.routes.js
const express = require('express');
const ShopOrdersController = require('../../controllers/shop/orders.controller');
const { verifyToken } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication to order routes
router.use(verifyToken);

// GET /api/v1/orders - Get user orders
router.get('/', ShopOrdersController.getUserOrders);

// GET /api/v1/orders/:id - Get specific order
router.get('/:id', ShopOrdersController.getUserOrder);

// POST /api/v1/orders - Create new order
router.post('/', ShopOrdersController.createOrder);

// PUT /api/v1/orders/:id/cancel - Cancel order
router.put('/:id/cancel', ShopOrdersController.cancelOrder);

// GET /api/v1/orders/status/:status - Get orders by status
router.get('/status/:status', ShopOrdersController.getUserOrdersByStatus);

module.exports = router;