// src/controllers/admin/products.controller.js
const ProductsService = require('../../services/products.service');
const BrandsService = require('../../services/brands.service');
const CategoriesService = require('../../services/categories.service');
const { success, fail, notFound, validationError } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');
const {
  uploadProductImages,
  organizeUploadedFiles,
  cleanupFiles,
  reorganizeProductImages,
  generateImagePreviews,
} = require('../../utils/imageUpload');

/**
 * Admin Products Controller - Admin product management endpoints
 */
class AdminProductsController {

  /**
   * GET /api/v1/admin/products
   * List products for admin
   */
  static listProducts = asyncHandler(async (req, res) => {
    const { page, limit, category, title, price, status } = req.query;

    const { rows, pagination } = await ProductsService.listProducts({
      isAdmin: true,
      page,
      limit,
      category,
      search: title, // Map title to search
      sortKey: price,
      status,
    });

    return success(res, rows, pagination, 'Products retrieved successfully');
  });

  /**
   * GET /api/v1/admin/products/:id
   * Get product by ID for admin
   */
  static getProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductsService.getProductById(id);

    if (!product) {
      return notFound(res, 'Product');
    }

    return success(res, product, null, 'Product retrieved successfully');
  });

  /**
   * POST /api/v1/admin/products
   * Create a new product
   */
  static createProduct = [
    uploadProductImages,
    asyncHandler(async (req, res) => {
      try {
        const {
          name,
          description,
          sku,
          price,
          discount_price,
          category_id,
          brand_id,
          status,
          featured,
          meta_title,
          meta_description,
          variants,
          tags,
        } = req.body;

        if (!name) {
          if (req.files) cleanupFiles(req.files);
          return validationError(res, { name: 'Product name is required' });
        }

        // Create product
        const { productId, slug } = await ProductsService.createProduct({
          name,
          description,
          sku,
          price,
          discount_price,
          category_id,
          brand_id,
          status,
          featured,
          meta_title,
          meta_description,
          tags,
        });

        // Handle images
        let finalImages = { heroImage: null, detailImages: [], allImages: [] };
        if (req.files && Object.keys(req.files).length) {
          try {
            const defaultImageIndex = req.body.defaultImageIndex;
            finalImages = await reorganizeProductImages(name, req.files, defaultImageIndex);

            if (finalImages.heroImage) {
              await ProductsService.addProductImage(productId, {
                url: finalImages.heroImage,
                alt_text: `${name} - Hero Image`,
                title: 'Hero',
                is_primary: 1,
                image_type: 'hero',
                position: 1,
              });
            }

            if (finalImages.detailImages.length) {
              await Promise.all(
                finalImages.detailImages.map((url, idx) =>
                  ProductsService.addProductImage(productId, {
                    url,
                    alt_text: `${name} - Detail Image ${idx + 1}`,
                    title: `Detail ${idx + 1}`,
                    is_primary: 0,
                    image_type: 'detail',
                    position: idx + 2,
                  })
                )
              );
            }
          } catch (imageErr) {
            console.error('Image processing error (product created anyway):', imageErr);
          }
        }

        // Handle variants
        if (variants) {
          try {
            const variantData = typeof variants === 'string' ? JSON.parse(variants) : variants;
            if (Array.isArray(variantData)) {
              await ProductsService.addProductVariants(productId, variantData);
            }
          } catch (e) {
            console.error('Variant parse error (continuing):', e);
          }
        }

        // Get created product with details
        const createdProduct = await ProductsService.getProductById(productId);

        return success(res, {
          product: createdProduct,
          images: finalImages,
          productId,
          slug,
        }, null, 'Product created successfully');

      } catch (error) {
        if (req.files) cleanupFiles(req.files);
        throw error;
      }
    })
  ];

  /**
   * PUT /api/v1/admin/products/:id
   * Update a product
   */
  static updateProduct = [
    uploadProductImages,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const {
          name,
          description,
          sku,
          price,
          discount_price,
          category_id,
          brand_id,
          status,
          featured,
          meta_title,
          meta_description,
          tags,
        } = req.body;

        if (!name) {
          return validationError(res, { name: 'Product name is required' });
        }

        // Update product
        const updated = await ProductsService.updateProduct(id, {
          name,
          description,
          sku,
          price,
          discount_price,
          category_id,
          brand_id,
          status,
          featured,
          meta_title,
          meta_description,
          tags,
        });

        if (!updated) {
          return notFound(res, 'Product');
        }

        // Handle new images
        if (req.files && Object.keys(req.files).length) {
          const uploaded = organizeUploadedFiles(req.files);

          // New hero image
          if (uploaded.heroImage) {
            await ProductsService.setPrimaryImage(id, uploaded.heroImage);
            await ProductsService.addProductImage(id, {
              url: uploaded.heroImage,
              alt_text: `${name} - Hero Image`,
              title: 'Hero',
              is_primary: 1,
              image_type: 'hero',
              position: 1,
            });
          }

          // New detail images
          if (uploaded.detailImages?.length) {
            await Promise.all(
              uploaded.detailImages.map((url, idx) =>
                ProductsService.addProductImage(id, {
                  url,
                  alt_text: `${name} - Detail Image ${idx + 1}`,
                  title: `Detail ${idx + 1}`,
                  is_primary: 0,
                  image_type: 'detail',
                  position: idx + 10,
                })
              )
            );
          }
        }

        return success(res, { productId: id }, null, 'Product updated successfully');

      } catch (error) {
        if (req.files) cleanupFiles(req.files);
        throw error;
      }
    })
  ];

  /**
   * PUT /api/v1/admin/products/:id/status
   * Update product status
   */
  static updateProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return validationError(res, { status: 'Status is required' });
    }

    try {
      const updated = await ProductsService.updateProductStatus(id, status);

      if (!updated) {
        return notFound(res, 'Product');
      }

      return success(res, { productId: id }, null, 'Product status updated successfully');
    } catch (error) {
      if (error.message === 'Invalid status value') {
        return validationError(res, { status: 'Invalid status value. Must be show/hide or active/draft/archived' });
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/admin/products/:id
   * Delete a product
   */
  static deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get product info before deletion
    const product = await ProductsService.getProductById(id);
    if (!product) {
      return notFound(res, 'Product');
    }

    const deleted = await ProductsService.deleteProduct(id);

    if (!deleted) {
      return notFound(res, 'Product');
    }

    return success(res, {
      productId: id,
      productName: product.name,
    }, null, 'Product permanently deleted from database');
  });

  /**
   * PATCH /api/v1/admin/products/delete-many
   * Delete multiple products
   */
  static deleteManyProducts = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationError(res, { ids: 'Product IDs array is required' });
    }

    const deleted = await ProductsService.deleteManyProducts(ids);

    return success(res, {
      deletedCount: deleted,
      productIds: ids,
    }, null, `${deleted} product(s) successfully deleted`);
  });

  /**
   * POST /api/v1/admin/products/preview-images
   * Preview uploaded images before creating product
   */
  static previewImages = [
    uploadProductImages,
    asyncHandler(async (req, res) => {
      try {
        const { name } = req.body;
        if (!name) {
          if (req.files) cleanupFiles(req.files);
          return validationError(res, { name: 'Product name is required for preview' });
        }

        if (!req.files || !Object.keys(req.files).length) {
          return success(res, {
            previews: [],
            productSlug: ProductsService.createSlug ? ProductsService.createSlug(name) : name.toLowerCase().replace(/\s+/g, '-'),
          }, null, 'No images uploaded');
        }

        const previews = generateImagePreviews(req.files);
        const productSlug = ProductsService.createSlug ? ProductsService.createSlug(name) : name.toLowerCase().replace(/\s+/g, '-');

        return success(res, {
          previews,
          productSlug,
          folderPath: `/files/products/images/${productSlug}`,
          instructions: {
            selectDefault: 'Choose which image should be the hero image',
            heroFolder: 'Selected image will be moved to hero/hero.jpg',
            detailsFolder: 'Other images will be moved to details/details-N.jpg',
          },
        }, null, 'Image preview generated successfully');

      } catch (error) {
        if (req.files) cleanupFiles(req.files);
        throw error;
      }
    })
  ];

}

module.exports = AdminProductsController;