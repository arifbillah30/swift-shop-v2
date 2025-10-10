// src/services/brands.service.js
const db = require('../lib/db');

/**
 * Brands Service - Pure SQL & data logic
 */
class BrandsService {
  
  /**
   * Get all brands with product count
   */
  static async getAllBrands() {
    const [brands] = await db.query(
      `
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count
      FROM brands b
      ORDER BY b.name ASC
      `
    );
    return brands;
  }

  /**
   * Get brand by ID
   */
  static async getBrandById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count
      FROM brands b
      WHERE b.id = ?
      `,
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Get brand by slug
   */
  static async getBrandBySlug(slug) {
    const [rows] = await db.query(
      `
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count
      FROM brands b
      WHERE b.slug = ?
      `,
      [slug]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Create a new brand
   */
  static async createBrand(brandData) {
    const { name, description, is_active } = brandData;
    
    if (!name) {
      throw new Error('Brand name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const [result] = await db.query(
      `
      INSERT INTO brands (name, slug, description, is_active)
      VALUES (?, ?, ?, ?)
      `,
      [name, slug, description || null, is_active !== false]
    );

    return { brandId: result.insertId, slug };
  }

  /**
   * Update a brand
   */
  static async updateBrand(id, brandData) {
    const { name, description, is_active } = brandData;
    
    if (!name) {
      throw new Error('Brand name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const [result] = await db.query(
      `
      UPDATE brands 
      SET name = ?, slug = ?, description = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [name, slug, description || null, is_active !== false, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Delete a brand
   */
  static async deleteBrand(id) {
    // Check if brand has products
    const [products] = await db.query(
      `SELECT COUNT(*) as count FROM products WHERE brand_id = ?`,
      [id]
    );

    if (products[0].count > 0) {
      throw new Error('Cannot delete brand with existing products');
    }

    const [result] = await db.query(`DELETE FROM brands WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Check if brand name exists
   */
  static async brandNameExists(name, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM brands WHERE name = ?';
    let params = [name];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count > 0;
  }
}

module.exports = BrandsService;