// src/controllers/addresses.controller.js
const AddressesService = require('../services/addresses.service');
const { success, fail, notFound, validationError } = require('../lib/http');
const asyncHandler = require('../middlewares/asyncHandler');
const Joi = require('joi');

// Validation schema for address data
const addressSchema = Joi.object({
  line1: Joi.string().max(191).required(),
  line2: Joi.string().allow('', null).max(191),
  city: Joi.string().max(120).required(),
  state: Joi.string().allow('', null).max(120),
  postal_code: Joi.string().allow('', null).max(40),
  country_code: Joi.string().length(2).uppercase().default('BD'),
  is_default: Joi.boolean().default(false),
  address_type: Joi.string().valid('billing', 'shipping', 'other'),
});

/**
 * Addresses Controller
 */
class AddressesController {

  /**
   * GET /addresses/:email
   * Get all addresses for a user by email
   */
  static getAllAddresses = asyncHandler(async (req, res) => {
    const email = AddressesService.normalizeEmail(req.params.email);
    
    if (!email) {
      return validationError(res, { email: 'Email is required' });
    }

    const userId = await AddressesService.getUserIdByEmail(email);
    if (!userId) {
      return notFound(res, 'User');
    }

    const addresses = await AddressesService.getUserAddresses(userId);
    return success(res, addresses, null, 'Addresses retrieved successfully');
  });

  /**
   * GET /addresses/:email/:type
   * Get single address by type
   */
  static getAddressByType = asyncHandler(async (req, res) => {
    const email = AddressesService.normalizeEmail(req.params.email);
    const type = (req.params.type || '').toLowerCase();

    if (!email) {
      return validationError(res, { email: 'Email is required' });
    }

    if (!AddressesService.isValidAddressType(type)) {
      return validationError(res, { type: 'Invalid address type. Must be billing, shipping, or other' });
    }

    const userId = await AddressesService.getUserIdByEmail(email);
    if (!userId) {
      return notFound(res, 'User');
    }

    const address = await AddressesService.getAddressByType(userId, type);
    if (!address) {
      return notFound(res, 'Address');
    }

    return success(res, address, null, 'Address retrieved successfully');
  });

  /**
   * PUT /addresses/:email/:type
   * Upsert address by type (URL carries the type)
   */
  static upsertAddress = asyncHandler(async (req, res) => {
    const email = AddressesService.normalizeEmail(req.params.email);
    const type = (req.params.type || '').toLowerCase();

    if (!email) {
      return validationError(res, { email: 'Email is required' });
    }

    if (!AddressesService.isValidAddressType(type)) {
      return validationError(res, { type: 'Invalid address type. Must be billing, shipping, or other' });
    }

    const userId = await AddressesService.getUserIdByEmail(email);
    if (!userId) {
      return notFound(res, 'User');
    }

    // Validate body (address_type comes from URL, forbid it in body)
    const { value, error } = addressSchema
      .fork(['address_type'], (schema) => schema.forbidden())
      .validate(req.body, { stripUnknown: true });

    if (error) {
      return validationError(res, { [error.details[0].path[0]]: error.details[0].message });
    }

    const exists = await AddressesService.addressExists(userId, type);
    const address = await AddressesService.upsertAddress(userId, type, value);

    const message = exists ? 'Address updated successfully' : 'Address created successfully';
    return success(res, address, null, message);
  });

  /**
   * POST /addresses
   * Create address (type in body)
   */
  static createAddress = asyncHandler(async (req, res) => {
    const email = AddressesService.normalizeEmail(req.body.userEmail);
    
    if (!email) {
      return validationError(res, { userEmail: 'userEmail is required' });
    }

    const { value, error } = addressSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return validationError(res, { [error.details[0].path[0]]: error.details[0].message });
    }

    const type = value.address_type?.toLowerCase();
    if (!AddressesService.isValidAddressType(type)) {
      return validationError(res, { address_type: 'address_type must be billing, shipping, or other' });
    }

    const userId = await AddressesService.getUserIdByEmail(email);
    if (!userId) {
      return notFound(res, 'User');
    }

    await AddressesService.createAddress(userId, { ...value, address_type: type });
    
    return success(res, null, null, 'Address added successfully');
  });

  /**
   * DELETE /addresses/:email/:type
   * Delete address by type
   */
  static deleteAddress = asyncHandler(async (req, res) => {
    const email = AddressesService.normalizeEmail(req.params.email);
    const type = (req.params.type || '').toLowerCase();

    if (!email) {
      return validationError(res, { email: 'Email is required' });
    }

    if (!AddressesService.isValidAddressType(type)) {
      return validationError(res, { type: 'Invalid address type. Must be billing, shipping, or other' });
    }

    const userId = await AddressesService.getUserIdByEmail(email);
    if (!userId) {
      return notFound(res, 'User');
    }

    const deleted = await AddressesService.deleteAddress(userId, type);
    if (!deleted) {
      return notFound(res, 'Address');
    }

    return success(res, null, null, 'Address deleted successfully');
  });
}

module.exports = AddressesController;