// Frontend/src/Components/Account/account-orders.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './account-orders.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const AccountOrders = () => {
  const [orders, setOrders] = useState([]);              // normalized list from /admin/orders
  const [selectedOrder, setSelectedOrder] = useState(null); // full detail { order, items, addresses, ... }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

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

  // Load orders list (admin) and filter by current user email
  const loadOrders = async () => {
    if (!user?.email) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders?limit=200&offset=0`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        setListError(data?.message || 'Failed to load orders');
        setOrders([]);
      } else {
        const mine = data.data.filter(o => o.user_email === user.email);
        setOrders(mine);
      }
    } catch (e) {
      console.error(e);
      setListError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Load order details for modal
  const loadOrderDetail = async (orderId) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.data?.order) {
        setDetailError(data?.message || 'Failed to load order details');
        setSelectedOrder(null);
      } else {
        setSelectedOrder(data.data);
      }
    } catch (e) {
      console.error(e);
      setDetailError('Failed to load order details');
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

  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">Orders</h2>
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
                <table className="orders-table"><tbody><tr><td>Loading…</td></tr></tbody></table>
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
                    {listError ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>{listError}</td></tr>
                    ) : orders.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>No orders found.</td></tr>
                    ) : (
                      orders.map((o, idx) => (
                        <tr key={idx}>
                          <td>#{o.order_number || o.id}</td>
                          <td>{fmtDate(o.created_at || o.placed_at)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{o.status}</td>
                          <td>{fmtMoney(o.grand_total, o.currency)}</td>
                          <td>
                            <button className="btn-primary" onClick={() => handleViewOrder(o)}>
                              VIEW
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal (keeps your design) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-button" onClick={handleCloseModal}>&times;</span>

            {detailLoading ? (
              <p>Loading…</p>
            ) : detailError ? (
              <p className="text-danger">{detailError}</p>
            ) : selectedOrder ? (
              <>
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> #{selectedOrder.order.order_number || selectedOrder.order.id}</p>
                <p><strong>Date:</strong> {fmtDate(selectedOrder.order.created_at || selectedOrder.order.placed_at)}</p>
                <p><strong>Total:</strong> {fmtMoney(selectedOrder.order.grand_total, selectedOrder.order.currency)}</p>
                {selectedOrder.order.payment_method && (
                  <p><strong>Payment Method:</strong> {selectedOrder.order.payment_method}</p>
                )}
                <h4>Items:</h4>
                <ul>
                  {(selectedOrder.items || []).map((it) => (
                    <li key={it.id}>
                      <strong>{it.product_name /* alias from backend is product_name */}</strong> - {fmtMoney(it.unit_price, selectedOrder.order.currency)} x {it.quantity}
                    </li>
                  ))}
                </ul>
                <button className="btn btn-primary" onClick={handleCloseModal}>Close</button>
              </>
            ) : (
              <p>Loading…</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default AccountOrders;
