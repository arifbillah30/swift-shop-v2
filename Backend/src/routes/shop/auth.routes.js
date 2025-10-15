// src/routes/shop/auth.routes.js
const express = require('express');
const ShopAuthController = require('../../controllers/shop/auth.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

// POST /api/v1/auth/register - Register user
router.post('/register', ShopAuthController.register);

// POST /api/v1/auth/login - Login user
router.post('/login', ShopAuthController.login);

// PUT /api/v1/auth/update-account - Update account
router.put('/update-account', ShopAuthController.updateAccount);

// PUT /api/v1/auth/update-password - Update password
router.put('/update-password', ShopAuthController.updatePassword);

// GET /api/v1/auth/profile - Get user profile (requires auth)
// router.get('/profile', auth, ShopAuthController.getProfile);

module.exports = router;