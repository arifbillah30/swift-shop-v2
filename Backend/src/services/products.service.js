// src/services/products.service.js
const db = require('../lib/db');
const { createSlug } = require('../utils/imageUpload');

/**
 * Products Service - Pure SQL & data logic
 */
class ProductsService {
  
  // ----- Helper methods -----
  static buildListFilters({ isAdmin, category, brand, search, status }) {
    const where = [];
    const params = [];

    if (!isAdmin) where.push(`p.status = 'active'`);
    if (isAdmin && status) { where.push('p.status = ?'); params.push(status); }
    if (category && category !== 'All') { where.push('c.slug = ?'); params.push(category); }
    if (brand && brand !== 'All') { where.push('b.slug = ?'); params.push(brand); }
    if (search && search.trim()) {
      where.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    return { whereSql: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
  }

  static buildListOrder(sortKey, isPublic) {
    if (isPublic) {
      switch (sortKey) {
        case 'price_low':  return 'ORDER BY min_price ASC';
        case 'price_high': return 'ORDER BY min_price DESC';
        case 'popular':    return 'ORDER BY review_count DESC, avg_rating DESC';
        default:           return 'ORDER BY p.created_at DESC';
      }
    }
    // admin
    switch (sortKey) {
      case 'low':                    return 'ORDER BY min_price ASC';
      case 'high':                   return 'ORDER BY max_price DESC';
      case 'published':              return "ORDER BY (p.status='active') DESC, p.created_at DESC";
      case 'unPublished':            return "ORDER BY (p.status='draft') DESC, p.created_at DESC";
      case 'status-selling':         return 'ORDER BY (COALESCE(total_stock,0)>0) DESC, p.created_at DESC';
      case 'status-out-of-stock':    return 'ORDER BY (COALESCE(total_stock,0)=0) DESC, p.created_at DESC';
      case 'date-added-asc':         return 'ORDER BY p.created_at ASC';
      case 'date-added-desc':        return 'ORDER BY p.created_at DESC';
      case 'date-updated-asc':       return 'ORDER BY p.updated_at ASC';
      case 'date-updated-desc':      return 'ORDER BY p.updated_at DESC';
      default:                       return 'ORDER BY p.created_at DESC';
    }
  }

  // ----- Core methods -----

  /**
   * List products with filters and pagination
   */
  static async listProducts({
    isAdmin = false,
    page = 1,
    limit = 20,
    category,
    brand,
    search,
    status,
    sortKey = isAdmin ? '' : 'newest',
  }) {
    const safeLimit = Math.min(Math.max(parseInt(limit || 20, 10), 1), 100);
    const safePage = Math.max(parseInt(page || 1, 10), 1);
    const offset = (safePage - 1) * safeLimit;

    const { whereSql, params } = this.buildListFilters({ isAdmin, category, brand, search, status });
    const orderSql = this.buildListOrder(sortKey, !isAdmin);

    // COUNT
    const [countRows] = await db.query(
      `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereSql}
      `,
      params
    );
    const total = countRows[0]?.total || 0;

    // PAGE ROWS
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.discount_price,
        p.status,
        p.featured,
        c.name AS category_name,
        c.slug AS category_slug,
        b.name AS brand_name,
        b.slug AS brand_slug,

        MIN(pv.price) AS min_price,
        MAX(pv.price) AS max_price,

        COALESCE(MIN(pv.price), p.price) AS price_effective,
        ROUND(COALESCE(MIN(pv.price), p.price) * (1 - p.discount_price/100), 2) AS price,

        (SELECT url FROM product_images
           WHERE product_id = p.id AND is_primary = 1
           ORDER BY position ASC
           LIMIT 1) AS primary_image,

        COALESCE(SUM(i.quantity), 0) AS total_stock,

        AVG(r.rating) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = TRUE
      LEFT JOIN inventory i ON pv.id = i.variant_id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'published'
      ${whereSql}
      GROUP BY p.id, c.name, c.slug, b.name, b.slug
      ${orderSql}
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, offset]
    );

    return {
      rows,
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    };
  }

  /**
   * Get product by slug (for public)
   */
  static async getProductBySlug(slug) {
    const [rows] = await db.query(
      `
      SELECT 
        p.*,
        c.name AS category_name, c.slug AS category_slug,
        b.name AS brand_name, b.slug AS brand_slug,
        AVG(r.rating) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'published'
      WHERE p.slug = ? AND p.status = 'active'
      GROUP BY p.id
      `,
      [slug]
    );

    if (!rows.length) return null;
    
    const product = rows[0];

    // Get variants
    const [variants] = await db.query(
      `
      SELECT pv.*, i.quantity
      FROM product_variants pv
      LEFT JOIN inventory i ON pv.id = i.variant_id
      WHERE pv.product_id = ? AND pv.is_active = TRUE
      ORDER BY pv.price ASC
      `,
      [product.id]
    );

    // Get images
    const [images] = await db.query(
      `
      SELECT url, alt_text, title, is_primary, position
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, position ASC
      `,
      [product.id]
    );

    // Get reviews
    const [reviews] = await db.query(
      `
      SELECT r.id, r.rating, r.title, r.body, r.created_at, u.display_name AS user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? AND r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT 10
      `,
      [product.id]
    );

    return { ...product, variants, images, reviews };
  }

  /**
   * Get product by ID (for admin)
   */
  static async getProductById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        p.*, 
        c.name AS category_name, 
        b.name AS brand_name,
        COUNT(DISTINCT pv.id) AS variant_count,
        COUNT(DISTINCT pi.id) AS image_count,
        COALESCE(SUM(i.quantity), 0) AS total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN inventory i ON pv.id = i.variant_id
      WHERE p.id = ?
      GROUP BY p.id
      `,
      [id]
    );

    if (!rows.length) return null;

    const product = rows[0];

    // Get variants
    const [variants] = await db.query(
      `
      SELECT pv.*, i.quantity
      FROM product_variants pv
      LEFT JOIN inventory i ON pv.id = i.variant_id
      WHERE pv.product_id = ?
      `,
      [id]
    );

    // Get images
    const [images] = await db.query(
      `
      SELECT * FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, position ASC
      `,
      [id]
    );

    return { ...product, variants, images };
  }

  /**
   * Create a new product
   */
  static async createProduct(productData) {
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
    } = productData;

    const slug = createSlug(name);
    const statusMap = { show: 'active', hide: 'draft' };
    const dbStatus = statusMap[status] || 'active';
    const featuredBool = featured === true || featured === 'true' ? 1 : 0;

    // Handle tags
    let processedTags = null;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        processedTags = JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch {
        processedTags = JSON.stringify([]);
      }
    } else if (Array.isArray(tags)) {
      processedTags = JSON.stringify(tags);
    } else if (tags != null) {
      processedTags = JSON.stringify([]);
    }

    const [result] = await db.query(
      `
      INSERT INTO products (
        name, slug, description, sku, price, discount_price,
        category_id, brand_id, status, featured, meta_title, meta_description, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        slug,
        description || '',
        sku || '',
        price || null,
        discount_price || 0,
        category_id || null,
        brand_id || null,
        dbStatus,
        featuredBool,
        meta_title || name,
        meta_description || description || '',
        processedTags,
      ]
    );

    return { productId: result.insertId, slug };
  }

  /**
   * Update a product
   */
  static async updateProduct(id, productData) {
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
    } = productData;

    const slug = createSlug(name);
    const dbStatus =
      status === 'archived' ? 'archived' : status === 'active' ? 'active' : status === 'show' ? 'active' : status === 'hide' ? 'draft' : 'draft';
    const featuredBool = featured === true || featured === 'true' ? 1 : 0;

    let processedTags = null;
    if (tags !== undefined) {
      try {
        const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
        processedTags = JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch {
        processedTags = JSON.stringify([]);
      }
    }

    const fields = [
      'name = ?',
      'slug = ?',
      'description = ?',
      'sku = ?',
      'price = ?',
      'discount_price = ?',
      'category_id = ?',
      'brand_id = ?',
      'status = ?',
      'featured = ?',
      'meta_title = ?',
      'meta_description = ?',
    ];
    const values = [
      name,
      slug,
      description || '',
      sku || '',
      price || null,
      discount_price || 0,
      category_id || null,
      brand_id || null,
      dbStatus,
      featuredBool,
      meta_title || name,
      meta_description || description || '',
    ];

    if (processedTags !== null) { 
      fields.push('tags = ?'); 
      values.push(processedTags); 
    }
    fields.push('updated_at = NOW()');

    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    const [result] = await db.query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Update product status
   */
  static async updateProductStatus(id, status) {
    const dbStatus = status === 'show' ? 'active' : status === 'hide' ? 'draft' : status;

    if (!['active', 'draft', 'archived'].includes(dbStatus)) {
      throw new Error('Invalid status value');
    }

    const [result] = await db.query(
      `UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?`,
      [dbStatus, id]
    );

    return result.affectedRows > 0;
  }

  /**
   * Delete a product
   */
  static async deleteProduct(id) {
    await db.query('START TRANSACTION');
    try {
      await db.query(`DELETE FROM product_images WHERE product_id = ?`, [id]);
      await db.query(
        `
        DELETE i FROM inventory i
        INNER JOIN product_variants pv ON i.variant_id = pv.id
        WHERE pv.product_id = ?
        `,
        [id]
      );
      await db.query(`DELETE FROM product_variants WHERE product_id = ?`, [id]);
      const [result] = await db.query(`DELETE FROM products WHERE id = ?`, [id]);

      if (!result.affectedRows) {
        await db.query('ROLLBACK');
        return false;
      }

      await db.query('COMMIT');
      return true;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Delete multiple products by IDs
   */
  static async deleteManyProducts(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return 0;
    }

    await db.query('START TRANSACTION');
    try {
      const placeholders = ids.map(() => '?').join(',');
      
      // Delete related data first
      await db.query(`DELETE FROM product_images WHERE product_id IN (${placeholders})`, ids);
      await db.query(
        `
        DELETE i FROM inventory i
        INNER JOIN product_variants pv ON i.variant_id = pv.id
        WHERE pv.product_id IN (${placeholders})
        `,
        ids
      );
      await db.query(`DELETE FROM product_variants WHERE product_id IN (${placeholders})`, ids);
      
      // Delete products
      const [result] = await db.query(`DELETE FROM products WHERE id IN (${placeholders})`, ids);

      await db.query('COMMIT');
      return result.affectedRows;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Add product image
   */
  static async addProductImage(productId, imageData) {
    const { url, alt_text, title, is_primary, image_type, position } = imageData;
    
    const [result] = await db.query(
      `
      INSERT INTO product_images (product_id, url, alt_text, title, is_primary, image_type, position)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [productId, url, alt_text, title, is_primary, image_type, position]
    );

    return result.insertId;
  }

  /**
   * Set primary image (reset others)
   */
  static async setPrimaryImage(productId, imageUrl) {
    await db.query(`UPDATE product_images SET is_primary = 0 WHERE product_id = ?`, [productId]);
    await db.query(
      `UPDATE product_images SET is_primary = 1 WHERE product_id = ? AND url = ?`,
      [productId, imageUrl]
    );
  }

  /**
   * Add product variants
   */
  static async addProductVariants(productId, variants) {
    if (!Array.isArray(variants) || !variants.length) return;

    const queries = variants.map((v) =>
      db.query(
        `
        INSERT INTO product_variants (
          product_id, sku, color, size, material, price, compare_at_price, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [productId, v.sku, v.color, v.size, v.material, v.price, v.compare_at_price || null, 1]
      )
    );

    await Promise.all(queries);
  }
}

module.exports = ProductsService;