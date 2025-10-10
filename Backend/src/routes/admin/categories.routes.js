// src/routes/admin/categories.routes.js
const express = require('express');
const AdminCategoriesController = require('../../controllers/admin/categories.controller');
const { verifyToken, verifyAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken, verifyAdmin);

// GET /api/v1/admin/categories - List categories
router.get('/', AdminCategoriesController.listCategories);

// GET /api/v1/admin/categories/parents - List parent categories
router.get('/parents', AdminCategoriesController.listParentCategories);

// GET /api/v1/admin/categories/:id - Get category by ID
router.get('/:id', AdminCategoriesController.getCategory);

// GET /api/v1/admin/categories/:id/children - Get child categories
router.get('/:id/children', AdminCategoriesController.getChildCategories);

// POST /api/v1/admin/categories - Create category
router.post('/', AdminCategoriesController.createCategory);

// PUT /api/v1/admin/categories/:id - Update category
router.put('/:id', AdminCategoriesController.updateCategory);

// DELETE /api/v1/admin/categories/:id - Delete category
router.delete('/:id', AdminCategoriesController.deleteCategory);

module.exports = router;