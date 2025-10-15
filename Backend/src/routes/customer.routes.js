// src/routes/customer.routes.js
// Legacy customer routes for backward compatibility
const express = require('express');
const AdminCustomersController = require('../controllers/admin/customers.controller');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken, verifyAdmin);

// GET /customer - Get all customers
router.get('/', AdminCustomersController.getAllCustomers);

// POST /customer/create - Create new customer
router.post('/create', AdminCustomersController.createCustomer);

// POST /customer/add/all - Bulk add customers (placeholder)
router.post('/add/all', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Bulk customer import not yet implemented'
  });
});

// POST /customer/filter/:email - Filter by email
router.post('/filter/:email', AdminCustomersController.filterCustomer);

// GET /customer/:id - Get single customer
router.get('/:id', AdminCustomersController.getCustomerById);

// PUT /customer/:id - Update customer
router.put('/:id', AdminCustomersController.updateCustomer);

// DELETE /customer/:id - Delete customer
router.delete('/:id', AdminCustomersController.deleteCustomer);

module.exports = router;
