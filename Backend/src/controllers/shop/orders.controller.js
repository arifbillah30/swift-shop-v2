// src/controllers/shop/orders.controller.js
const OrdersService = require('../../services/orders.service');
const ProductsService = require('../../services/products.service');
const { success, fail, notFound, validationError } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Shop Orders Controller - Customer-facing order management
 */
class ShopOrdersController {

  /**
   * GET /api/v1/orders
   * Get orders for the authenticated user
   */
  static getUserOrders = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return validationError(res, { auth: 'User authentication required' });
    }

    const orders = await OrdersService.getOrdersByUserId(userId);
    return success(res, orders, null, 'User orders retrieved successfully');
  });

  /**
   * GET /api/v1/orders/:id
   * Get specific order by ID (must belong to authenticated user)
   */
  static getUserOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return validationError(res, { auth: 'User authentication required' });
    }

    if (!id || isNaN(id)) {
      return validationError(res, { id: 'Valid order ID is required' });
    }

    const order = await OrdersService.getOrderById(id);
    if (!order) {
      return notFound(res, 'Order');
    }

    // Ensure the order belongs to the authenticated user
    if (order.user_id !== userId) {
      return notFound(res, 'Order'); // Don't reveal that order exists for security
    }

    return success(res, order, null, 'Order retrieved successfully');
  });

  /**
   * POST /api/v1/orders
   * Create a new order (from cart/checkout)
   */
  static createOrder = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return validationError(res, { auth: 'User authentication required' });
    }

    const {
      items,
      shipping_address,
      billing_address,
      payment_method,
      notes
    } = req.body;

    // Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return validationError(res, { items: 'Order items are required' });
    }

    if (!shipping_address) {
      return validationError(res, { shipping_address: 'Shipping address is required' });
    }

    if (!payment_method) {
      return validationError(res, { payment_method: 'Payment method is required' });
    }

    try {
      // Calculate totals
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          return validationError(res, { items: 'Each item must have valid product_id and quantity' });
        }

        // Get product details to validate and calculate price
        const product = await ProductsService.getProductById(item.product_id);
        if (!product || product.status !== 'active') {
          return validationError(res, { items: `Product ${item.product_id} is not available` });
        }

        const itemPrice = item.price || product.price;
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          ...item,
          price: itemPrice,
          total: itemTotal,
          product_name: product.name
        });
      }

      const tax = subtotal * 0.1; // 10% tax - should be configurable
      const shipping = 10; // Flat shipping - should be calculated
      const total = subtotal + tax + shipping;

      // Create order data
      const orderData = {
        user_id: userId,
        items: validatedItems,
        subtotal,
        tax,
        shipping,
        total,
        shipping_address: JSON.stringify(shipping_address),
        billing_address: JSON.stringify(billing_address || shipping_address),
        payment_method,
        notes: notes || null,
        status: 'pending'
      };

      // Note: This would need to be implemented in OrdersService
      // const orderId = await OrdersService.createOrder(orderData);

      // For now, return a placeholder response
      return success(res, {
        message: 'Order creation logic needs to be implemented in OrdersService',
        orderData
      }, null, 'Order processing initiated');

    } catch (error) {
      console.error('Order creation error:', error);
      return fail(res, 500, 'Failed to create order');
    }
  });

  /**
   * PUT /api/v1/orders/:id/cancel
   * Cancel an order (if allowed)
   */
  static cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return validationError(res, { auth: 'User authentication required' });
    }

    if (!id || isNaN(id)) {
      return validationError(res, { id: 'Valid order ID is required' });
    }

    const order = await OrdersService.getOrderById(id);
    if (!order) {
      return notFound(res, 'Order');
    }

    // Ensure the order belongs to the authenticated user
    if (order.user_id !== userId) {
      return notFound(res, 'Order');
    }

    // Check if order can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return validationError(res, { 
        status: 'Order cannot be cancelled. Only pending or processing orders can be cancelled.' 
      });
    }

    const updated = await OrdersService.updateOrderStatus(id, 'cancelled');
    if (!updated) {
      return fail(res, 500, 'Failed to cancel order');
    }

    return success(res, { 
      orderId: id,
      status: 'cancelled'
    }, null, 'Order cancelled successfully');
  });

  /**
   * GET /api/v1/orders/status/:status
   * Get user orders by status
   */
  static getUserOrdersByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return validationError(res, { auth: 'User authentication required' });
    }

    if (!OrdersService.isValidStatus(status)) {
      return validationError(res, { 
        status: 'Invalid status. Must be one of: pending, processing, shipped, delivered, completed, cancelled' 
      });
    }

    // This would need a new method in OrdersService
    // const orders = await OrdersService.getUserOrdersByStatus(userId, status);

    // For now, return placeholder
    return success(res, [], null, `User orders with status '${status}' retrieved successfully`);
  });
}

module.exports = ShopOrdersController;