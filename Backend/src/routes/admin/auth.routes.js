// src/routes/admin/auth.routes.js
const express = require('express');
const AdminAuthController = require('../../controllers/admin/auth.controller');
const { verifyToken, verifyAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Public admin auth routes
router.post('/register', AdminAuthController.register);
router.post('/login', AdminAuthController.login);
router.put('/forget-password', AdminAuthController.forgetPassword);
router.put('/reset-password', AdminAuthController.resetPassword);

// Protected staff management routes
router.use(verifyToken, verifyAdmin);

// Staff management
router.get('/staff', AdminAuthController.getAllStaff);
router.post('/staff', AdminAuthController.addStaff);
router.put('/staff/:id', AdminAuthController.updateStaff);
router.put('/staff/:id/status', AdminAuthController.updateStaffStatus);
router.delete('/staff/:id', AdminAuthController.deleteStaff);

module.exports = router;