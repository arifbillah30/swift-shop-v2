// src/routes/admin/products.routes.js
const express = require('express');
const AdminProductsController = require('../../controllers/admin/products.controller');
const { verifyToken, verifyAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken, verifyAdmin);

// GET /api/v1/admin/products - List products for admin
router.get('/', AdminProductsController.listProducts);

// GET /api/v1/admin/products/:id - Get product by ID
router.get('/:id', AdminProductsController.getProduct);

// POST /api/v1/admin/products - Create product
router.post('/', AdminProductsController.createProduct);

// POST /api/v1/admin/products/preview-images - Preview images
router.post('/preview-images', AdminProductsController.previewImages);

// PUT /api/v1/admin/products/:id - Update product
router.put('/:id', AdminProductsController.updateProduct);

// PUT /api/v1/admin/products/:id/status - Update product status
router.put('/:id/status', AdminProductsController.updateProductStatus);

// DELETE /api/v1/admin/products/:id - Delete product
router.delete('/:id', AdminProductsController.deleteProduct);

// PATCH /api/v1/admin/products/delete-many - Delete multiple products
router.patch('/delete-many', AdminProductsController.deleteManyProducts);

module.exports = router;