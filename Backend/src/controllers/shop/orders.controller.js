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

    const order = await OrdersService.getOrderWithDetails(id);
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
      currency = 'BDT',
      subtotal = 0,
      discount_total = 0,
      tax_total = 0,
      shipping_total = 0,
      grand_total = 0
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
      // Validate items and calculate totals if not provided
      let calculatedSubtotal = subtotal;
      const validatedItems = [];

      for (const item of items) {
        if (!item.product_name_snapshot && !item.product_id) {
          return validationError(res, { items: 'Each item must have product_name_snapshot or product_id' });
        }

        if (!item.quantity || item.quantity <= 0) {
          return validationError(res, { items: 'Each item must have valid quantity' });
        }

        if (!item.unit_price || item.unit_price <= 0) {
          return validationError(res, { items: 'Each item must have valid unit_price' });
        }

        const itemTotal = Number(item.unit_price) * Number(item.quantity);
        
        validatedItems.push({
          product_id: item.product_id || null,
          variant_id: item.variant_id || null,
          product_name_snapshot: item.product_name_snapshot || `Product ${item.product_id}`,
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
          front_img_snapshot: item.front_img_snapshot || null,
          back_img_snapshot: item.back_img_snapshot || null,
          reviews_text_snapshot: item.reviews_text_snapshot || null
        });

        if (subtotal === 0) {
          calculatedSubtotal += itemTotal;
        }
      }

      // Create order data
      const orderData = {
        user_id: userId,
        items: validatedItems,
        subtotal: Number(calculatedSubtotal),
        discount_total: Number(discount_total),
        tax_total: Number(tax_total),
        shipping_total: Number(shipping_total),
        grand_total: Number(grand_total) || (calculatedSubtotal + Number(tax_total) + Number(shipping_total) - Number(discount_total)),
        shipping_address,
        billing_address: billing_address || shipping_address,
        payment_method,
        currency,
        status: 'pending',
        payment_status: 'unpaid',
        fulfillment_status: 'unfulfilled'
      };

      const result = await OrdersService.createOrder(orderData);

      return success(res, {
        order_id: result.orderId,
        order_number: result.orderNumber,
        status: 'pending',
        grand_total: orderData.grand_total
      }, null, 'Order created successfully');

    } catch (error) {
      console.error('Order creation error:', error);
      
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        return validationError(res, { items: 'Invalid product or variant referenced in order items' });
      }
      
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
        status: 'Invalid status. Must be one of: pending, confirmed, processing, shipped, delivered, cancelled, refunded' 
      });
    }

    const orders = await OrdersService.getUserOrdersByStatus(userId, status);

    return success(res, orders, null, `User orders with status '${status}' retrieved successfully`);
  });
}

module.exports = ShopOrdersController;