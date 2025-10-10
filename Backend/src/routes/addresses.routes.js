// src/routes/addresses.routes.js
const express = require('express');
const AddressesController = require('../controllers/addresses.controller');

const router = express.Router();

// GET /addresses/:email - Get all addresses for a user
router.get('/:email', AddressesController.getAllAddresses);

// GET /addresses/:email/:type - Get single address by type
router.get('/:email/:type', AddressesController.getAddressByType);

// PUT /addresses/:email/:type - Upsert address by type
router.put('/:email/:type', AddressesController.upsertAddress);

// POST /addresses - Create address (type in body)
router.post('/', AddressesController.createAddress);

// DELETE /addresses/:email/:type - Delete address by type
router.delete('/:email/:type', AddressesController.deleteAddress);

module.exports = router;