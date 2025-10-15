// src/routes/admin/customers.routes.js
const express = require('express');
const AdminCustomersController = require('../../controllers/admin/customers.controller');
const { verifyToken, verifyAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken, verifyAdmin);

// GET /api/v1/admin/customers - Get all customers
router.get('/', AdminCustomersController.getAllCustomers);

// POST /api/v1/admin/customers/create - Create new customer
router.post('/create', AdminCustomersController.createCustomer);

// POST /api/v1/admin/customers/filter/:email - Filter by email (legacy)
router.post('/filter/:email', AdminCustomersController.filterCustomer);

// GET /api/v1/admin/customers/:id - Get single customer
router.get('/:id', AdminCustomersController.getCustomerById);

// PUT /api/v1/admin/customers/:id - Update customer
router.put('/:id', AdminCustomersController.updateCustomer);

// DELETE /api/v1/admin/customers/:id - Delete customer
router.delete('/:id', AdminCustomersController.deleteCustomer);

module.exports = router;
