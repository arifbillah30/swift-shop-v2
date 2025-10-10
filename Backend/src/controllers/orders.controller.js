// src/controllers/orders.controller.js
const OrdersService = require('../services/orders.service');
const { success, fail, notFound, validationError } = require('../lib/http');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * Orders Controller - Admin order management endpoints
 */
class OrdersController {

  /**
   * GET /all-orders
   * Get all orders (admin)
   */
  static getAllOrders = asyncHandler(async (req, res) => {
    const orders = await OrdersService.getAllOrders();
    return success(res, orders, null, 'Orders retrieved successfully');
  });

  /**
   * GET /get-orders/:id
   * Get single order by ID
   */
  static getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return validationError(res, { id: 'Valid order ID is required' });
    }

    const order = await OrdersService.getOrderById(id);
    if (!order) {
      return notFound(res, 'Order');
    }

    return success(res, order, null, 'Order retrieved successfully');
  });

  /**
   * PUT /update-orders/:id
   * Update an existing order
   */
  static updateOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { productName, productPrice, quantity, paymentMethod, status } = req.body;

    if (!id || isNaN(id)) {
      return validationError(res, { id: 'Valid order ID is required' });
    }

    // Check if order exists
    const existingOrder = await OrdersService.getOrderById(id);
    if (!existingOrder) {
      return notFound(res, 'Order');
    }

    // Validate status if provided
    if (status && !OrdersService.isValidStatus(status)) {
      return validationError(res, { 
        status: 'Invalid status. Must be one of: pending, processing, shipped, delivered, completed, cancelled' 
      });
    }

    // Validate quantity and price if provided
    if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
      return validationError(res, { quantity: 'Quantity must be a positive number' });
    }

    if (productPrice !== undefined && (isNaN(productPrice) || productPrice < 0)) {
      return validationError(res, { productPrice: 'Product price must be a positive number' });
    }

    const updateData = {
      productName,
      productPrice,
      quantity,
      paymentMethod,
      status
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updated = await OrdersService.updateOrder(id, updateData);
    if (!updated) {
      return fail(res, 500, 'Failed to update order');
    }

    return success(res, { orderId: id }, null, 'Order updated successfully');
  });

  /**
   * PUT /update-orders/:id/status
   * Update order status only
   */
  static updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || isNaN(id)) {
      return validationError(res, { id: 'Valid order ID is required' });
    }

    if (!status) {
      return validationError(res, { status: 'Status is required' });
    }

    if (!OrdersService.isValidStatus(status)) {
      return validationError(res, { 
        status: 'Invalid status. Must be one of: pending, processing, shipped, delivered, completed, cancelled' 
      });
    }

    // Check if order exists
    const existingOrder = await OrdersService.getOrderById(id);
    if (!existingOrder) {
      return notFound(res, 'Order');
    }

    const updated = await OrdersService.updateOrderStatus(id, status);
    if (!updated) {
      return fail(res, 500, 'Failed to update order status');
    }

    return success(res, { 
      orderId: id, 
      oldStatus: existingOrder.status, 
      newStatus: status 
    }, null, 'Order status updated successfully');
  });

  /**
   * DELETE /delete-orders/:id
   * Delete an order
   */
  static deleteOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return validationError(res, { id: 'Valid order ID is required' });
    }

    // Check if order exists
    const existingOrder = await OrdersService.getOrderById(id);
    if (!existingOrder) {
      return notFound(res, 'Order');
    }

    const deleted = await OrdersService.deleteOrder(id);
    if (!deleted) {
      return fail(res, 500, 'Failed to delete order');
    }

    return success(res, { 
      orderId: id,
      productName: existingOrder.productName 
    }, null, 'Order deleted successfully');
  });

  /**
   * GET /orders-by-status/:status
   * Get orders by status
   */
  static getOrdersByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;

    if (!OrdersService.isValidStatus(status)) {
      return validationError(res, { 
        status: 'Invalid status. Must be one of: pending, processing, shipped, delivered, completed, cancelled' 
      });
    }

    const orders = await OrdersService.getOrdersByStatus(status);
    return success(res, orders, null, `Orders with status '${status}' retrieved successfully`);
  });

  /**
   * GET /orders-statistics
   * Get order statistics for admin dashboard
   */
  static getOrderStatistics = asyncHandler(async (req, res) => {
    const stats = await OrdersService.getOrderStatistics();
    return success(res, stats, null, 'Order statistics retrieved successfully');
  });
}

module.exports = OrdersController;