// src/controllers/shop/cart.controller.js
const CartService = require('../../services/cart.service');
const { success, fail, notFound } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Shop Cart Controller - Cart management endpoints
 */
class ShopCartController {

  /**
   * GET /api/v1/cart
   * Get current user's cart with items
   */
  static getCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return fail(res, 401, 'User authentication required');
    }

    const cart = await CartService.getOrCreateUserCart(userId);
    const cartWithItems = await CartService.getCartWithItems(cart.id);

    return success(res, cartWithItems, null, 'Cart retrieved successfully');
  });

  /**
   * POST /api/v1/cart/items
   * Add item to cart
   */
  static addToCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { variant_id, quantity = 1 } = req.body;

    if (!userId) {
      return fail(res, 401, 'User authentication required');
    }

    if (!variant_id) {
      return fail(res, 400, 'Variant ID is required');
    }

    if (quantity < 1 || quantity > 20) {
      return fail(res, 400, 'Quantity must be between 1 and 20');
    }

    const cart = await CartService.getOrCreateUserCart(userId);
    const result = await CartService.addItemToCart(cart.id, variant_id, quantity);

    return success(res, result, null, 'Item added to cart successfully');
  });

  /**
   * PUT /api/v1/cart/items/:itemId
   * Update cart item quantity
   */
  static updateCartItem = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return fail(res, 401, 'User authentication required');
    }

    if (quantity < 1 || quantity > 20) {
      return fail(res, 400, 'Quantity must be between 1 and 20');
    }

    const updated = await CartService.updateCartItemQuantity(itemId, quantity, userId);
    
    if (!updated) {
      return notFound(res, 'Cart item');
    }

    return success(res, { itemId, quantity }, null, 'Cart item updated successfully');
  });

  /**
   * DELETE /api/v1/cart/items/:itemId
   * Remove item from cart
   */
  static removeFromCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return fail(res, 401, 'User authentication required');
    }

    const removed = await CartService.removeCartItem(itemId, userId);
    
    if (!removed) {
      return notFound(res, 'Cart item');
    }

    return success(res, { itemId }, null, 'Item removed from cart successfully');
  });

  /**
   * DELETE /api/v1/cart
   * Clear entire cart
   */
  static clearCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return fail(res, 401, 'User authentication required');
    }

    await CartService.clearUserCart(userId);

    return success(res, null, null, 'Cart cleared successfully');
  });

  /**
   * POST /api/v1/cart/sync
   * Sync local cart data with server (for logged-in users)
   */
  static syncCart = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { items } = req.body; // Array of {variant_id, quantity}

    if (!userId) {
      return fail(res, 401, 'User authentication required');
    }

    if (!Array.isArray(items)) {
      return fail(res, 400, 'Items must be an array');
    }

    const cart = await CartService.getOrCreateUserCart(userId);
    const syncedCart = await CartService.syncCartItems(cart.id, items);

    return success(res, syncedCart, null, 'Cart synced successfully');
  });

}

module.exports = ShopCartController;