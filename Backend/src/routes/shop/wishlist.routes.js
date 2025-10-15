// Backend/src/routes/shop/wishlist.routes.js

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth');
const db = require('../../lib/db');

/**
 * GET /api/v1/wishlist
 * Get user's wishlist items
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // First get or create user's default wishlist
    let [wishlists] = await db.query(`
      SELECT id FROM wishlists WHERE user_id = ? AND name = 'Default'
    `, [userId]);

    let wishlistId;
    if (wishlists.length === 0) {
      // Create default wishlist
      const [result] = await db.query(`
        INSERT INTO wishlists (user_id, name, created_at) VALUES (?, 'Default', NOW())
      `, [userId]);
      wishlistId = result.insertId;
    } else {
      wishlistId = wishlists[0].id;
    }

    // Get wishlist items
    const [rows] = await db.query(`
      SELECT 
        wi.id as wishlist_item_id,
        wi.product_id,
        wi.variant_id,
        wi.added_at,
        p.name as product_name,
        p.slug,
        p.price,
        p.discount_price,
        p.image,
        p.description,
        p.category,
        p.in_stock,
        pv.size,
        pv.color,
        pv.sku as variant_sku
      FROM wishlist_items wi
      JOIN products p ON wi.product_id = p.id
      LEFT JOIN product_variants pv ON wi.variant_id = pv.id
      WHERE wi.wishlist_id = ?
      ORDER BY wi.added_at DESC
    `, [wishlistId]);

    res.json({
      success: true,
      data: {
        items: rows,
        total: rows.length
      }
    });

  } catch (error) {
    console.error('Wishlist fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/wishlist
 * Add item to wishlist
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, variant_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Check if product exists
    const [productCheck] = await db.query(
      'SELECT id FROM products WHERE id = ?',
      [product_id]
    );

    if (productCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get or create user's default wishlist
    let [wishlists] = await db.query(`
      SELECT id FROM wishlists WHERE user_id = ? AND name = 'Default'
    `, [userId]);

    let wishlistId;
    if (wishlists.length === 0) {
      // Create default wishlist
      const [result] = await db.query(`
        INSERT INTO wishlists (user_id, name, created_at) VALUES (?, 'Default', NOW())
      `, [userId]);
      wishlistId = result.insertId;
    } else {
      wishlistId = wishlists[0].id;
    }

    // Check if item already in wishlist
    const [existingItem] = await db.query(
      'SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [wishlistId, product_id, variant_id, variant_id]
    );

    if (existingItem.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    const [result] = await db.query(
      'INSERT INTO wishlist_items (wishlist_id, product_id, variant_id, added_at) VALUES (?, ?, ?, NOW())',
      [wishlistId, product_id, variant_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        wishlist_item_id: result.insertId,
        product_id: product_id,
        variant_id: variant_id
      }
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist',
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/wishlist/:product_id
 * Remove item from wishlist
 */
router.delete('/:product_id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.params;
    const { variant_id } = req.query; // Optional variant_id from query params

    // Get user's default wishlist
    const [wishlists] = await db.query(`
      SELECT id FROM wishlists WHERE user_id = ? AND name = 'Default'
    `, [userId]);

    if (wishlists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const wishlistId = wishlists[0].id;

    // Remove from wishlist
    const [result] = await db.query(
      'DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [wishlistId, product_id, variant_id, variant_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/wishlist/check/:product_id
 * Check if product is in user's wishlist
 */
router.get('/check/:product_id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.params;

    // Get user's default wishlist
    const [wishlists] = await db.query(`
      SELECT id FROM wishlists WHERE user_id = ? AND name = 'Default'
    `, [userId]);

    if (wishlists.length === 0) {
      return res.json({
        success: true,
        data: {
          in_wishlist: false
        }
      });
    }

    const wishlistId = wishlists[0].id;

    // Check if product is in wishlist
    const [rows] = await db.query(
      'SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?',
      [wishlistId, product_id]
    );

    res.json({
      success: true,
      data: {
        in_wishlist: rows.length > 0
      }
    });

  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status',
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/wishlist
 * Clear entire wishlist
 */
router.delete('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's default wishlist
    const [wishlists] = await db.query(`
      SELECT id FROM wishlists WHERE user_id = ? AND name = 'Default'
    `, [userId]);

    if (wishlists.length === 0) {
      return res.json({
        success: true,
        message: 'Wishlist already empty',
        data: {
          items_removed: 0
        }
      });
    }

    const wishlistId = wishlists[0].id;

    // Delete all wishlist items
    const [result] = await db.query(
      'DELETE FROM wishlist_items WHERE wishlist_id = ?',
      [wishlistId]
    );

    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: {
        items_removed: result.affectedRows
      }
    });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
      error: error.message
    });
  }
});

module.exports = router;