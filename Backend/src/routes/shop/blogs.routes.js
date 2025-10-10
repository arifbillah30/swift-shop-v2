// src/routes/shop/blogs.routes.js
const express = require('express');
const ShopBlogsController = require('../../controllers/shop/blogs.controller');

const router = express.Router();

// GET /api/v1/blogs - List all blogs
router.get('/', ShopBlogsController.listBlogs);

// GET /api/v1/blogs/:id - Get blog by ID
router.get('/:id', ShopBlogsController.getBlog);

module.exports = router;