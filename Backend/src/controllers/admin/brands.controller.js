// src/controllers/admin/brands.controller.js
const BrandsService = require('../../services/brands.service');
const { success, fail, notFound, validationError } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Admin Brands Controller
 */
class AdminBrandsController {

  /**
   * GET /api/v1/admin/brands
   * List all brands
   */
  static listBrands = asyncHandler(async (req, res) => {
    const brands = await BrandsService.getAllBrands();
    return success(res, brands, null, 'Brands retrieved successfully');
  });

  /**
   * GET /api/v1/admin/brands/:id
   * Get brand by ID
   */
  static getBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const brand = await BrandsService.getBrandById(id);

    if (!brand) {
      return notFound(res, 'Brand');
    }

    return success(res, brand, null, 'Brand retrieved successfully');
  });

  /**
   * POST /api/v1/admin/brands
   * Create a new brand
   */
  static createBrand = asyncHandler(async (req, res) => {
    const { name, description, is_active } = req.body;

    if (!name) {
      return validationError(res, { name: 'Brand name is required' });
    }

    // Check if brand name already exists
    const exists = await BrandsService.brandNameExists(name);
    if (exists) {
      return validationError(res, { name: 'Brand name already exists' });
    }

    const { brandId, slug } = await BrandsService.createBrand({
      name,
      description,
      is_active,
    });

    const createdBrand = await BrandsService.getBrandById(brandId);

    return success(res, {
      brand: createdBrand,
      brandId,
      slug,
    }, null, 'Brand created successfully');
  });

  /**
   * PUT /api/v1/admin/brands/:id
   * Update a brand
   */
  static updateBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    if (!name) {
      return validationError(res, { name: 'Brand name is required' });
    }

    // Check if brand exists
    const existingBrand = await BrandsService.getBrandById(id);
    if (!existingBrand) {
      return notFound(res, 'Brand');
    }

    // Check if name is taken by another brand
    const nameExists = await BrandsService.brandNameExists(name, id);
    if (nameExists) {
      return validationError(res, { name: 'Brand name already exists' });
    }

    const updated = await BrandsService.updateBrand(id, {
      name,
      description,
      is_active,
    });

    if (!updated) {
      return notFound(res, 'Brand');
    }

    const updatedBrand = await BrandsService.getBrandById(id);

    return success(res, {
      brand: updatedBrand,
      brandId: id,
    }, null, 'Brand updated successfully');
  });

  /**
   * DELETE /api/v1/admin/brands/:id
   * Delete a brand
   */
  static deleteBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get brand info before deletion
    const brand = await BrandsService.getBrandById(id);
    if (!brand) {
      return notFound(res, 'Brand');
    }

    try {
      const deleted = await BrandsService.deleteBrand(id);

      if (!deleted) {
        return notFound(res, 'Brand');
      }

      return success(res, {
        brandId: id,
        brandName: brand.name,
      }, null, 'Brand deleted successfully');

    } catch (error) {
      if (error.message === 'Cannot delete brand with existing products') {
        return fail(res, 400, 'Cannot delete brand with existing products');
      }
      throw error;
    }
  });

}

module.exports = AdminBrandsController;