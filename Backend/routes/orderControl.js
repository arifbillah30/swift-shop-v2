// Backend/routes/orderControl.js

const express = require('express');
const router = express.Router();
const db = require('./dbconnect');

// Small helper to coerce/whitelist enums
const enumOrNull = (val, allowed) => (val && allowed.includes(val) ? val : null);

// ==============================
// Admin: List orders (summary)
// GET /admin/orders?limit=50&offset=0&status=pending
// ==============================
router.get('/admin/orders', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;

    const params = [];
    let where = '';
    if (status) {
      where = 'WHERE o.status = ?';
      params.push(status);
    }

    // Aggregate items per order
    const sql = `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        u.email AS user_email,
        o.status,
        o.payment_status,
        o.fulfillment_status,
        o.payment_method,
        o.currency,
        o.subtotal,
        o.discount_total,
        o.tax_total,
        o.shipping_total,
        o.grand_total,
        o.placed_at,
        o.created_at,
        COUNT(oi.id) AS item_count,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN users u ON u.id = o.user_id
      ${where}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?;
    `;
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows, limit, offset });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ===================================
// Admin: Get one order (full details)
// GET /admin/orders/:id
// ===================================
router.get('/admin/orders/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(400).json({ success: false, message: 'Invalid order id' });

  try {
    const orderSql = `
      SELECT
        o.*,
        u.email AS user_email,
        u.display_name AS user_display_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1;
    `;

    const itemsSql = `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.variant_id,
        oi.product_name_snapshot AS product_name,
        oi.unit_price,
        oi.quantity,
        oi.line_total,
        oi.front_img_snapshot AS front_img,
        oi.back_img_snapshot AS back_img,
        oi.reviews_text_snapshot AS reviews_text
      FROM order_items oi
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC;
    `;

    const addrSql = `
      SELECT
        id, order_id, address_type, full_name, phone,
        line1, line2, city, state, postal_code, country_code
      FROM order_addresses
      WHERE order_id = ?
      ORDER BY address_type;
    `;

    const paymentsSql = `
      SELECT
        id, provider, method, amount, currency, status, transaction_id, paid_at, created_at
      FROM payments
      WHERE order_id = ?
      ORDER BY created_at DESC;
    `;

    const shipmentsSql = `
      SELECT
        id, carrier, tracking_number, status, shipped_at, delivered_at, shipping_cost, created_at
      FROM shipments
      WHERE order_id = ?
      ORDER BY created_at DESC;
    `;

    const [[orderRow]] = await db.query(orderSql, [orderId]);
    if (!orderRow) return res.status(404).json({ success: false, message: 'Order not found' });

    const [items] = await db.query(itemsSql, [orderId]);
    const [addresses] = await db.query(addrSql, [orderId]);
    const [payments] = await db.query(paymentsSql, [orderId]);
    const [shipments] = await db.query(shipmentsSql, [orderId]);

    res.json({
      success: true,
      data: {
        order: orderRow,
        items,
        addresses,
        payments,
        shipments,
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ========================================
// Admin: Update order statuses / fields
// PUT /admin/orders/:id
// Body: { status?, payment_status?, fulfillment_status?, payment_method? }
// ========================================
router.put('/admin/orders/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(400).json({ success: false, message: 'Invalid order id' });

  try {
    const allowedStatus = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    const allowedPayment = ['unpaid', 'paid', 'refunded', 'partial_refund'];
    const allowedFulfillment = ['unfulfilled', 'partial', 'fulfilled'];

    const status = enumOrNull(req.body.status, allowedStatus);
    const payment_status = enumOrNull(req.body.payment_status, allowedPayment);
    const fulfillment_status = enumOrNull(req.body.fulfillment_status, allowedFulfillment);
    const payment_method = typeof req.body.payment_method === 'string' ? req.body.payment_method : null;

    // Build dynamic update
    const sets = [];
    const params = [];
    if (status !== null) { sets.push('status = ?'); params.push(status); }
    if (payment_status !== null) { sets.push('payment_status = ?'); params.push(payment_status); }
    if (fulfillment_status !== null) { sets.push('fulfillment_status = ?'); params.push(fulfillment_status); }
    if (payment_method !== null) { sets.push('payment_method = ?'); params.push(payment_method); }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const sql = `
      UPDATE orders
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;
    params.push(orderId);

    const [result] = await db.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ========================================
// (Optional) Admin: Cancel order quickly
// PUT /admin/orders/:id/cancel
// ========================================
router.put('/admin/orders/:id/cancel', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(400).json({ success: false, message: 'Invalid order id' });

  try {
    const [result] = await db.query(
      `UPDATE orders SET status='cancelled', fulfillment_status='unfulfilled', updated_at=NOW() WHERE id=?`,
      [orderId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;
