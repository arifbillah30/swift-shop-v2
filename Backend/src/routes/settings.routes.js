// src/routes/settings.routes.js
const express = require('express');
const SettingsController = require('../controllers/settings.controller');

const router = express.Router();

// GET /setting/global/all - Get all global settings
router.get('/global/all', SettingsController.getGlobalSettings);

// GET /setting/global/:key - Get specific setting by key
router.get('/global/:key', SettingsController.getSetting);

// PUT /setting/global/:key - Update or create a setting
router.put('/global/:key', SettingsController.setSetting);

// DELETE /setting/global/:key - Delete a setting
router.delete('/global/:key', SettingsController.deleteSetting);

// POST /setting/global/bulk - Update multiple settings at once
router.post('/global/bulk', SettingsController.setBulkSettings);

// GET /setting/app-info - Get application information
router.get('/app-info', SettingsController.getAppInfo);

// GET /setting/health - Health check endpoint
router.get('/health', SettingsController.healthCheck);

module.exports = router;