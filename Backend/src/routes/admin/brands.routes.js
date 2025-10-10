// src/routes/admin/brands.routes.js
const express = require('express');
const AdminBrandsController = require('../../controllers/admin/brands.controller');
const { verifyToken, verifyAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken, verifyAdmin);

// GET /api/v1/admin/brands - List brands
router.get('/', AdminBrandsController.listBrands);

// GET /api/v1/admin/brands/:id - Get brand by ID
router.get('/:id', AdminBrandsController.getBrand);

// POST /api/v1/admin/brands - Create brand
router.post('/', AdminBrandsController.createBrand);

// PUT /api/v1/admin/brands/:id - Update brand
router.put('/:id', AdminBrandsController.updateBrand);

// DELETE /api/v1/admin/brands/:id - Delete brand
router.delete('/:id', AdminBrandsController.deleteBrand);

module.exports = router;