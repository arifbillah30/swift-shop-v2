// src/controllers/shop/products.controller.js
const ProductsService = require('../../services/products.service');
const { success, fail, notFound } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Shop Products Controller - Public product endpoints
 */
class ShopProductsController {

  /**
   * GET /api/v1/products
   * List products for public shop
   */
  static listProducts = asyncHandler(async (req, res) => {
    const { page, limit, category, brand, search, sort } = req.query;

    const { rows, pagination } = await ProductsService.listProducts({
      isAdmin: false,
      page,
      limit,
      category,
      brand,
      search,
      sortKey: sort || 'newest',
    });

    return success(res, rows, pagination, 'Products retrieved successfully');
  });

  /**
   * GET /api/v1/products/:slug
   * Get product details by slug for public shop
   */
  static getProduct = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const product = await ProductsService.getProductBySlug(slug);

    if (!product) {
      return notFound(res, 'Product');
    }

    return success(res, product, null, 'Product retrieved successfully');
  });

}

module.exports = ShopProductsController;