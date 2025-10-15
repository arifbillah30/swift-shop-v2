// src/services/cart.service.js
const db = require('../lib/db');

/**
 * Cart Service - Cart business logic
 */
class CartService {

  /**
   * Get or create a cart for a user
   */
  static async getOrCreateUserCart(userId) {
    // First try to find an active cart for the user
    const [existingCarts] = await db.query(
      'SELECT * FROM carts WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'active']
    );

    if (existingCarts.length > 0) {
      return existingCarts[0];
    }

    // Create a new cart if none exists
    const [result] = await db.query(
      'INSERT INTO carts (user_id, status) VALUES (?, ?)',
      [userId, 'active']
    );

    return {
      id: result.insertId,
      user_id: userId,
      status: 'active',
      created_at: new Date(),
      updated_at: null
    };
  }

  /**
   * Get cart with all items and product details
   */
  static async getCartWithItems(cartId) {
    const [cartRows] = await db.query('SELECT * FROM carts WHERE id = ?', [cartId]);
    
    if (!cartRows.length) {
      return null;
    }

    const cart = cartRows[0];

    // Get cart items with product and variant details
    const [items] = await db.query(`
      SELECT 
        ci.id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        ci.unit_price_snapshot,
        ci.added_at,
        pv.sku,
        pv.color,
        pv.size,
        pv.material,
        pv.price as current_price,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.description,
        (SELECT url FROM product_images 
         WHERE product_id = p.id AND is_primary = 1 
         ORDER BY position ASC LIMIT 1) as primary_image,
        c.name as category_name,
        b.name as brand_name
      FROM cart_items ci
      JOIN product_variants pv ON ci.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE ci.cart_id = ?
      ORDER BY ci.added_at DESC
    `, [cartId]);

    return {
      ...cart,
      items: items.map(item => ({
        ...item,
        primary_image: item.primary_image 
          ? (item.primary_image.startsWith('http') ? item.primary_image : `http://localhost:4000${item.primary_image}`)
          : "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
      })),
      total_items: items.length,
      subtotal: items.reduce((sum, item) => sum + (parseFloat(item.unit_price_snapshot) * item.quantity), 0)
    };
  }

  /**
   * Add item to cart or update quantity if already exists
   */
  static async addItemToCart(cartId, variantId, quantity) {
    // Get variant details including current price
    const [variantRows] = await db.query(
      'SELECT * FROM product_variants WHERE id = ? AND is_active = 1',
      [variantId]
    );

    if (!variantRows.length) {
      throw new Error('Product variant not found or inactive');
    }

    const variant = variantRows[0];

    // Check if item already exists in cart
    const [existingItems] = await db.query(
      'SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?',
      [cartId, variantId]
    );

    if (existingItems.length > 0) {
      // Update existing item quantity
      const existingItem = existingItems[0];
      const newQuantity = Math.min(existingItem.quantity + quantity, 20); // Max 20 items
      
      const [updateResult] = await db.query(
        'UPDATE cart_items SET quantity = ?, unit_price_snapshot = ? WHERE id = ?',
        [newQuantity, variant.price, existingItem.id]
      );

      return {
        action: 'updated',
        item_id: existingItem.id,
        quantity: newQuantity,
        unit_price: variant.price
      };
    } else {
      // Add new item to cart
      const [insertResult] = await db.query(
        'INSERT INTO cart_items (cart_id, variant_id, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?)',
        [cartId, variantId, quantity, variant.price]
      );

      // Update cart timestamp
      await db.query('UPDATE carts SET updated_at = NOW() WHERE id = ?', [cartId]);

      return {
        action: 'added',
        item_id: insertResult.insertId,
        quantity: quantity,
        unit_price: variant.price
      };
    }
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItemQuantity(itemId, quantity, userId) {
    // Verify the item belongs to the user's cart
    const [items] = await db.query(`
      SELECT ci.* FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = ? AND c.user_id = ? AND c.status = 'active'
    `, [itemId, userId]);

    if (!items.length) {
      return false;
    }

    const [result] = await db.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ?',
      [quantity, itemId]
    );

    // Update cart timestamp
    await db.query(`
      UPDATE carts SET updated_at = NOW() 
      WHERE id = (SELECT cart_id FROM cart_items WHERE id = ?)
    `, [itemId]);

    return result.affectedRows > 0;
  }

  /**
   * Remove item from cart
   */
  static async removeCartItem(itemId, userId) {
    // Verify the item belongs to the user's cart
    const [items] = await db.query(`
      SELECT ci.cart_id FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = ? AND c.user_id = ? AND c.status = 'active'
    `, [itemId, userId]);

    if (!items.length) {
      return false;
    }

    const cartId = items[0].cart_id;

    const [result] = await db.query('DELETE FROM cart_items WHERE id = ?', [itemId]);

    // Update cart timestamp
    await db.query('UPDATE carts SET updated_at = NOW() WHERE id = ?', [cartId]);

    return result.affectedRows > 0;
  }

  /**
   * Clear all items from user's cart
   */
  static async clearUserCart(userId) {
    const [result] = await db.query(`
      DELETE ci FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE c.user_id = ? AND c.status = 'active'
    `, [userId]);

    // Update cart timestamp
    await db.query(
      'UPDATE carts SET updated_at = NOW() WHERE user_id = ? AND status = ?',
      [userId, 'active']
    );

    return result.affectedRows;
  }

  /**
   * Sync cart items (for when user logs in with local cart data)
   */
  static async syncCartItems(cartId, items) {
    if (!Array.isArray(items) || items.length === 0) {
      return this.getCartWithItems(cartId);
    }

    await db.query('START TRANSACTION');
    try {
      // Clear existing cart items
      await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

      // Add all items from sync
      for (const item of items) {
        const { variant_id, quantity } = item;
        
        if (!variant_id || !quantity || quantity < 1) {
          continue; // Skip invalid items
        }

        // Get current variant price
        const [variantRows] = await db.query(
          'SELECT price FROM product_variants WHERE id = ? AND is_active = 1',
          [variant_id]
        );

        if (variantRows.length > 0) {
          await db.query(
            'INSERT INTO cart_items (cart_id, variant_id, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?)',
            [cartId, variant_id, Math.min(quantity, 20), variantRows[0].price]
          );
        }
      }

      // Update cart timestamp
      await db.query('UPDATE carts SET updated_at = NOW() WHERE id = ?', [cartId]);

      await db.query('COMMIT');

      return this.getCartWithItems(cartId);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Convert cart to order (mark as converted)
   */
  static async convertCartToOrder(cartId) {
    const [result] = await db.query(
      'UPDATE carts SET status = ?, updated_at = NOW() WHERE id = ?',
      ['converted', cartId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get cart statistics for user
   */
  static async getCartStats(userId) {
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_carts,
        COUNT(ci.id) as total_items,
        COALESCE(SUM(ci.quantity), 0) as total_quantity,
        COALESCE(SUM(ci.quantity * ci.unit_price_snapshot), 0) as total_value
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      WHERE c.user_id = ? AND c.status = 'active'
    `, [userId]);

    return stats[0] || {
      total_carts: 0,
      total_items: 0,
      total_quantity: 0,
      total_value: 0
    };
  }

}

module.exports = CartService;