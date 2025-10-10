// src/routes/shop/products.routes.js
const express = require('express');
const ShopProductsController = require('../../controllers/shop/products.controller');
const { optionalAuth } = require('../../middlewares/auth');

const router = express.Router();

// GET /api/v1/products - List products for shop
router.get('/', optionalAuth, ShopProductsController.listProducts);

// GET /api/v1/products/:slug - Get product by slug
router.get('/:slug', optionalAuth, ShopProductsController.getProduct);

module.exports = router;