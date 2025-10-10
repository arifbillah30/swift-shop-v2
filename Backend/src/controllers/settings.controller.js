// src/controllers/settings.controller.js
const SettingsService = require('../services/settings.service');
const { success, fail, notFound, validationError } = require('../lib/http');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * Settings Controller - Application settings management
 */
class SettingsController {

  /**
   * GET /setting/global/all
   * Get all global settings
   */
  static getGlobalSettings = asyncHandler(async (req, res) => {
    const settings = await SettingsService.getGlobalSettings();
    return success(res, settings, null, 'Global settings retrieved successfully');
  });

  /**
   * GET /setting/global/:key
   * Get specific setting by key
   */
  static getSetting = asyncHandler(async (req, res) => {
    const { key } = req.params;

    if (!key) {
      return validationError(res, { key: 'Setting key is required' });
    }

    const value = await SettingsService.getSetting(key);
    if (value === null) {
      return notFound(res, 'Setting');
    }

    return success(res, { [key]: value }, null, 'Setting retrieved successfully');
  });

  /**
   * PUT /setting/global/:key
   * Update or create a setting
   */
  static setSetting = asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { value, type = 'string' } = req.body;

    if (!key) {
      return validationError(res, { key: 'Setting key is required' });
    }

    if (value === undefined) {
      return validationError(res, { value: 'Setting value is required' });
    }

    const validTypes = ['string', 'number', 'boolean', 'json'];
    if (!validTypes.includes(type)) {
      return validationError(res, { type: `Setting type must be one of: ${validTypes.join(', ')}` });
    }

    // Validate value based on type
    if (type === 'number' && isNaN(value)) {
      return validationError(res, { value: 'Value must be a valid number for number type' });
    }

    if (type === 'boolean' && typeof value !== 'boolean') {
      return validationError(res, { value: 'Value must be true or false for boolean type' });
    }

    if (type === 'json') {
      try {
        JSON.stringify(value);
      } catch (e) {
        return validationError(res, { value: 'Value must be valid JSON for json type' });
      }
    }

    const updated = await SettingsService.setSetting(key, value, type);
    if (!updated) {
      return fail(res, 500, 'Failed to update setting');
    }

    return success(res, { [key]: value }, null, 'Setting updated successfully');
  });

  /**
   * DELETE /setting/global/:key
   * Delete a setting
   */
  static deleteSetting = asyncHandler(async (req, res) => {
    const { key } = req.params;

    if (!key) {
      return validationError(res, { key: 'Setting key is required' });
    }

    const deleted = await SettingsService.deleteSetting(key);
    if (!deleted) {
      return notFound(res, 'Setting');
    }

    return success(res, { key }, null, 'Setting deleted successfully');
  });

  /**
   * POST /setting/global/bulk
   * Update multiple settings at once
   */
  static setBulkSettings = asyncHandler(async (req, res) => {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return validationError(res, { settings: 'Settings object is required' });
    }

    const results = {};
    const errors = {};

    for (const [key, settingData] of Object.entries(settings)) {
      try {
        const { value, type = 'string' } = settingData;
        const updated = await SettingsService.setSetting(key, value, type);
        results[key] = updated ? 'success' : 'failed';
      } catch (error) {
        errors[key] = error.message;
        results[key] = 'error';
      }
    }

    const hasErrors = Object.keys(errors).length > 0;
    const message = hasErrors 
      ? 'Some settings were updated successfully, but some failed'
      : 'All settings updated successfully';

    return success(res, { results, errors: hasErrors ? errors : undefined }, null, message);
  });

  /**
   * GET /setting/app-info
   * Get application information
   */
  static getAppInfo = asyncHandler(async (req, res) => {
    const appInfo = SettingsService.getAppInfo();
    return success(res, appInfo, null, 'Application information retrieved successfully');
  });

  /**
   * GET /setting/health
   * Health check endpoint
   */
  static healthCheck = asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      version: '2.0.0'
    };

    return success(res, health, null, 'Service is healthy');
  });
}

module.exports = SettingsController;