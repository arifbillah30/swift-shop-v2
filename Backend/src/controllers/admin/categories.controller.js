// src/controllers/admin/categories.controller.js
const CategoriesService = require('../../services/categories.service');
const { success, fail, notFound, validationError } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Admin Categories Controller
 */
class AdminCategoriesController {

  /**
   * GET /api/v1/admin/categories
   * List all categories
   */
  static listCategories = asyncHandler(async (req, res) => {
    const { hierarchy } = req.query;
    
    let categories;
    if (hierarchy === 'true') {
      categories = await CategoriesService.getCategoryHierarchy();
    } else {
      categories = await CategoriesService.getAllCategories();
    }
    
    return success(res, categories, null, 'Categories retrieved successfully');
  });

  /**
   * GET /api/v1/admin/categories/parents
   * List parent categories only
   */
  static listParentCategories = asyncHandler(async (req, res) => {
    const categories = await CategoriesService.getParentCategories();
    return success(res, categories, null, 'Parent categories retrieved successfully');
  });

  /**
   * GET /api/v1/admin/categories/:id
   * Get category by ID
   */
  static getCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await CategoriesService.getCategoryById(id);

    if (!category) {
      return notFound(res, 'Category');
    }

    return success(res, category, null, 'Category retrieved successfully');
  });

  /**
   * GET /api/v1/admin/categories/:id/children
   * Get child categories
   */
  static getChildCategories = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Verify parent exists
    const parent = await CategoriesService.getCategoryById(id);
    if (!parent) {
      return notFound(res, 'Parent category');
    }

    const children = await CategoriesService.getChildCategories(id);
    return success(res, children, null, 'Child categories retrieved successfully');
  });

  /**
   * POST /api/v1/admin/categories
   * Create a new category
   */
  static createCategory = asyncHandler(async (req, res) => {
    const { name, description, parent_id, is_active, sort_order } = req.body;

    if (!name) {
      return validationError(res, { name: 'Category name is required' });
    }

    // Check if category name already exists
    const exists = await CategoriesService.categoryNameExists(name);
    if (exists) {
      return validationError(res, { name: 'Category name already exists' });
    }

    // Verify parent exists if provided
    if (parent_id) {
      const parent = await CategoriesService.getCategoryById(parent_id);
      if (!parent) {
        return validationError(res, { parent_id: 'Parent category not found' });
      }
    }

    const { categoryId, slug } = await CategoriesService.createCategory({
      name,
      description,
      parent_id,
      is_active,
      sort_order,
    });

    const createdCategory = await CategoriesService.getCategoryById(categoryId);

    return success(res, {
      category: createdCategory,
      categoryId,
      slug,
    }, null, 'Category created successfully');
  });

  /**
   * PUT /api/v1/admin/categories/:id
   * Update a category
   */
  static updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, parent_id, is_active, sort_order } = req.body;

    if (!name) {
      return validationError(res, { name: 'Category name is required' });
    }

    // Check if category exists
    const existingCategory = await CategoriesService.getCategoryById(id);
    if (!existingCategory) {
      return notFound(res, 'Category');
    }

    // Check if name is taken by another category
    const nameExists = await CategoriesService.categoryNameExists(name, id);
    if (nameExists) {
      return validationError(res, { name: 'Category name already exists' });
    }

    // Verify parent exists if provided and prevent circular reference
    if (parent_id) {
      if (parent_id == id) {
        return validationError(res, { parent_id: 'Category cannot be its own parent' });
      }

      const parent = await CategoriesService.getCategoryById(parent_id);
      if (!parent) {
        return validationError(res, { parent_id: 'Parent category not found' });
      }
    }

    const updated = await CategoriesService.updateCategory(id, {
      name,
      description,
      parent_id,
      is_active,
      sort_order,
    });

    if (!updated) {
      return notFound(res, 'Category');
    }

    const updatedCategory = await CategoriesService.getCategoryById(id);

    return success(res, {
      category: updatedCategory,
      categoryId: id,
    }, null, 'Category updated successfully');
  });

  /**
   * DELETE /api/v1/admin/categories/:id
   * Delete a category
   */
  static deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get category info before deletion
    const category = await CategoriesService.getCategoryById(id);
    if (!category) {
      return notFound(res, 'Category');
    }

    try {
      const deleted = await CategoriesService.deleteCategory(id);

      if (!deleted) {
        return notFound(res, 'Category');
      }

      return success(res, {
        categoryId: id,
        categoryName: category.name,
      }, null, 'Category deleted successfully');

    } catch (error) {
      if (error.message === 'Cannot delete category with existing products') {
        return fail(res, 400, 'Cannot delete category with existing products');
      }
      if (error.message === 'Cannot delete category with child categories') {
        return fail(res, 400, 'Cannot delete category with child categories');
      }
      throw error;
    }
  });

}

module.exports = AdminCategoriesController;