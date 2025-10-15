// src/routes/shop/cart.routes.js
const express = require('express');
const ShopCartController = require('../../controllers/shop/cart.controller');
const { verifyToken } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication to all cart routes
router.use(verifyToken);

// GET /api/v1/cart - Get user's cart
router.get('/', ShopCartController.getCart);

// POST /api/v1/cart/items - Add item to cart
router.post('/items', ShopCartController.addToCart);

// PUT /api/v1/cart/items/:itemId - Update cart item quantity
router.put('/items/:itemId', ShopCartController.updateCartItem);

// DELETE /api/v1/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', ShopCartController.removeFromCart);

// DELETE /api/v1/cart - Clear entire cart
router.delete('/', ShopCartController.clearCart);

// POST /api/v1/cart/sync - Sync local cart with server
router.post('/sync', ShopCartController.syncCart);

module.exports = router;