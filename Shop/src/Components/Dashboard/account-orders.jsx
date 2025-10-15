// Frontend/src/Components/Account/account-orders.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './account-orders.css';
import OrderService from '../../services/OrderService';

const AccountOrders = () => {
  const [orders, setOrders] = useState([]);              // user orders from /api/v1/orders
  const [selectedOrder, setSelectedOrder] = useState(null); // full order detail
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // read user (original source + safe fallback)
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) ||
             JSON.parse(sessionStorage.getItem('user')) ||
             null;
    } catch {
      return null;
    }
  }, []);

  const fmtMoney = (n, currency = 'BDT') => `${currency} ${Number(n || 0).toFixed(2)}`;
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '-');

  // Load orders list using OrderService
  const loadOrders = async () => {
    if (!user?.email) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError('');
    try {
      const ordersData = await OrderService.getUserOrders();
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setListError(error.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Load order details for modal using OrderService
  const loadOrderDetail = async (orderId) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const orderDetail = await OrderService.getOrder(orderId);
      setSelectedOrder(orderDetail);
    } catch (error) {
      console.error('Failed to load order details:', error);
      setDetailError(error.message || 'Failed to load order details');
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleViewOrder = (orderRow) => {
    setIsModalOpen(true);
    setSelectedOrder(null);
    setDetailError('');
    if (orderRow?.id) {
      loadOrderDetail(orderRow.id);
    } else {
      setDetailError('Invalid order id');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setDetailError('');
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderNumber}? This action cannot be undone.`)) {
      return;
    }

    setCancellingOrderId(orderId);
    try {
      await OrderService.cancelOrder(orderId);
      
      // Update the order in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' }
            : order
        )
      );

      // If the cancelled order is currently viewed in modal, update it
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'cancelled' }));
      }

      alert(`Order #${orderNumber} has been cancelled successfully.`);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert(error.message || 'Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Check if an order can be cancelled
  const canCancelOrder = (order) => {
    return ['pending', 'confirmed', 'processing'].includes(order.status?.toLowerCase());
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    return `status-badge status-${statusLower}`;
  };

  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">My Orders</h2>
        <div className="row">
          <div className="col-lg-3">
            <ul className="account-nav">
              <li><Link to="/account-dashboard" className="menu-link">Dashboard</Link></li>
              <li><Link to="/account-orders" className="menu-link menu-link_active">Orders</Link></li>
              <li><Link to="/account-address" className="menu-link">Addresses</Link></li>
              <li><Link to="/account-details" className="menu-link">Account Details</Link></li>
              <li><Link to="/account-wishlist" className="menu-link">Wishlist</Link></li>
              <li><Link to="/logout" className="menu-link">Logout</Link></li>
            </ul>
          </div>
          <div className="col-lg-9">
            <div className="page-content my-account__orders-list">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading your orders...</p>
                </div>
              ) : listError ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⚠️</div>
                  <h3>Error Loading Orders</h3>
                  <p>{listError}</p>
                  <button className="btn-shop-now" onClick={loadOrders}>
                    Try Again
                  </button>
                </div>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3>No Orders Yet</h3>
                  <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
                  <Link to="/shop" className="btn-shop-now">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="order-number">
                            #{order.order_number || order.id}
                          </span>
                        </td>
                        <td>{fmtDate(order.created_at || order.placed_at)}</td>
                        <td>
                          <span className={getStatusBadgeClass(order.status)}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <strong>{fmtMoney(order.grand_total, order.currency)}</strong>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-view" 
                              onClick={() => handleViewOrder(order)}
                            >
                              View
                            </button>
                            {canCancelOrder(order) && (
                              <button 
                                className="btn-cancel" 
                                onClick={() => handleCancelOrder(order.id, order.order_number || order.id)}
                                disabled={cancellingOrderId === order.id}
                              >
                                {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleCloseModal}>
              ×
            </button>

            {detailLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading order details...</p>
              </div>
            ) : detailError ? (
              <div className="modal-body">
                <div className="empty-state">
                  <div className="empty-state-icon">⚠️</div>
                  <h3>Error Loading Order</h3>
                  <p>{detailError}</p>
                </div>
              </div>
            ) : selectedOrder ? (
              <>
                <div className="modal-header">
                  <h3>Order Details</h3>
                </div>
                
                <div className="modal-body">
                  <div className="order-info-grid">
                    <div className="order-info-item">
                      <div className="order-info-label">Order ID</div>
                      <div className="order-info-value">#{selectedOrder.order_number || selectedOrder.id}</div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label">Date</div>
                      <div className="order-info-value">{fmtDate(selectedOrder.created_at || selectedOrder.placed_at)}</div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label">Status</div>
                      <div className="order-info-value">
                        <span className={getStatusBadgeClass(selectedOrder.status)}>
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>
                    <div className="order-info-item">
                      <div className="order-info-label">Payment Status</div>
                      <div className="order-info-value">{selectedOrder.payment_status}</div>
                    </div>
                    {selectedOrder.payment_method && (
                      <div className="order-info-item">
                        <div className="order-info-label">Payment Method</div>
                        <div className="order-info-value">{selectedOrder.payment_method}</div>
                      </div>
                    )}
                  </div>
                  
                  {selectedOrder.shipping_address && (
                    <div className="address-section">
                      <h4>Shipping Address</h4>
                      <p>
                        {selectedOrder.shipping_address.full_name}<br/>
                        {selectedOrder.shipping_address.line1}<br/>
                        {selectedOrder.shipping_address.line2 && <>{selectedOrder.shipping_address.line2}<br/></>}
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postal_code}<br/>
                        {selectedOrder.shipping_address.country_code}
                        {selectedOrder.shipping_address.phone && <><br/>Phone: {selectedOrder.shipping_address.phone}</>}
                      </p>
                    </div>
                  )}
                  
                  <div className="order-items">
                    <h4>Order Items</h4>
                    {(selectedOrder.items || []).map((item) => (
                      <div key={item.id} className="order-item">
                        <div className="order-item-details">
                          <div className="order-item-name">
                            {item.product_name_snapshot}
                            {item.current_product_name && item.current_product_name !== item.product_name_snapshot && (
                              <span> (Current: {item.current_product_name})</span>
                            )}
                          </div>
                          {(item.variant_sku || item.color || item.size) && (
                            <div className="order-item-variant">
                              {item.variant_sku && <span>SKU: {item.variant_sku}</span>}
                              {item.color && <span> • Color: {item.color}</span>}
                              {item.size && <span> • Size: {item.size}</span>}
                            </div>
                          )}
                          <div className="order-item-price">
                            {fmtMoney(item.unit_price, selectedOrder.currency)} × {item.quantity}
                          </div>
                        </div>
                        <div className="order-item-total">
                          <strong>{fmtMoney(item.unit_price * item.quantity, selectedOrder.currency)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="order-totals">
                    <div className="total-row">
                      <span>Subtotal:</span>
                      <span>{fmtMoney(selectedOrder.subtotal, selectedOrder.currency)}</span>
                    </div>
                    {selectedOrder.tax_total > 0 && (
                      <div className="total-row">
                        <span>Tax:</span>
                        <span>{fmtMoney(selectedOrder.tax_total, selectedOrder.currency)}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_total > 0 && (
                      <div className="total-row">
                        <span>Shipping:</span>
                        <span>{fmtMoney(selectedOrder.shipping_total, selectedOrder.currency)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_total > 0 && (
                      <div className="total-row">
                        <span>Discount:</span>
                        <span>-{fmtMoney(selectedOrder.discount_total, selectedOrder.currency)}</span>
                      </div>
                    )}
                    <div className="total-row">
                      <span>Grand Total:</span>
                      <span>{fmtMoney(selectedOrder.grand_total, selectedOrder.currency)}</span>
                    </div>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="btn-modal btn-modal-primary" onClick={handleCloseModal}>
                      Close
                    </button>
                    {canCancelOrder(selectedOrder) && (
                      <button 
                        className="btn-modal btn-modal-danger" 
                        onClick={() => {
                          handleCancelOrder(selectedOrder.id, selectedOrder.order_number || selectedOrder.id);
                        }}
                        disabled={cancellingOrderId === selectedOrder.id}
                      >
                        {cancellingOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default AccountOrders;
