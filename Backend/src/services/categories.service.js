// src/services/categories.service.js
const db = require('../lib/db');

/**
 * Categories Service - Pure SQL & data logic
 */
class CategoriesService {
  
  /**
   * Get all categories with product count and parent info
   */
  static async getAllCategories() {
    const [categories] = await db.query(
      `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count,
        parent.name AS parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      ORDER BY c.sort_order ASC, c.name ASC
      `
    );
    return categories;
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count,
        parent.name AS parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.id = ?
      `,
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug) {
    const [rows] = await db.query(
      `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count,
        parent.name AS parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.slug = ?
      `,
      [slug]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Get parent categories (no parent_id)
   */
  static async getParentCategories() {
    const [categories] = await db.query(
      `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
      WHERE c.parent_id IS NULL
      ORDER BY c.sort_order ASC, c.name ASC
      `
    );
    return categories;
  }

  /**
   * Get child categories of a parent
   */
  static async getChildCategories(parentId) {
    const [categories] = await db.query(
      `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
      WHERE c.parent_id = ?
      ORDER BY c.sort_order ASC, c.name ASC
      `,
      [parentId]
    );
    return categories;
  }

  /**
   * Create a new category
   */
  static async createCategory(categoryData) {
    const { name, description, parent_id, is_active, sort_order } = categoryData;
    
    if (!name) {
      throw new Error('Category name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const [result] = await db.query(
      `
      INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, slug, description || null, parent_id || null, is_active !== false, sort_order || 0]
    );

    return { categoryId: result.insertId, slug };
  }

  /**
   * Update a category
   */
  static async updateCategory(id, categoryData) {
    const { name, description, parent_id, is_active, sort_order } = categoryData;
    
    if (!name) {
      throw new Error('Category name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const [result] = await db.query(
      `
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, parent_id = ?, is_active = ?, sort_order = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [name, slug, description || null, parent_id || null, is_active !== false, sort_order || 0, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id) {
    // Check if category has products
    const [products] = await db.query(
      `SELECT COUNT(*) as count FROM products WHERE category_id = ?`,
      [id]
    );

    if (products[0].count > 0) {
      throw new Error('Cannot delete category with existing products');
    }

    // Check if category has child categories
    const [children] = await db.query(
      `SELECT COUNT(*) as count FROM categories WHERE parent_id = ?`,
      [id]
    );

    if (children[0].count > 0) {
      throw new Error('Cannot delete category with child categories');
    }

    const [result] = await db.query(`DELETE FROM categories WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Check if category name exists
   */
  static async categoryNameExists(name, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM categories WHERE name = ?';
    let params = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count > 0;
  }

  /**
   * Get category hierarchy (nested structure)
   */
  static async getCategoryHierarchy() {
    const [categories] = await db.query(
      `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c
      ORDER BY c.parent_id ASC, c.sort_order ASC, c.name ASC
      `
    );

    // Build nested structure
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create map of all categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(cat.id));
        }
      } else {
        rootCategories.push(categoryMap.get(cat.id));
      }
    });

    return rootCategories;
  }
}

module.exports = CategoriesService;