// Frontend/src/Components/Dashboard/account-dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/authContext';
import DashboardService from '../../services/DashboardService';
import OrderService from '../../services/OrderService';
import './account-dashboard.css';

const AccountDashboard = () => {
  const { authData } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    recentOrders: [],
    profile: null,
    cart: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get user from auth context or fallback to storage
  const user = useMemo(() => {
    return authData?.user || 
           JSON.parse(sessionStorage.getItem('user') || 'null') ||
           JSON.parse(localStorage.getItem('user') || 'null') ||
           null;
  }, [authData]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setError('Please log in to view your dashboard.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Load all dashboard data in parallel
        const [statsResponse, ordersResponse, profileResponse, cartResponse] = await Promise.allSettled([
          DashboardService.getDashboardStats(),
          OrderService.getUserOrders(), // Direct call to OrderService
          DashboardService.getProfileSummary(),
          DashboardService.getCartSummary()
        ]);

        console.log('Dashboard API responses:', {
          stats: statsResponse,
          orders: ordersResponse,
          profile: profileResponse,
          cart: cartResponse
        });

        // Process orders data
        const ordersData = ordersResponse.status === 'fulfilled' ? ordersResponse.value : null;
        const ordersList = ordersData?.orders || ordersData || [];
        const recentOrders = Array.isArray(ordersList) ? ordersList.slice(0, 5) : [];

        setDashboardData({
          stats: statsResponse.status === 'fulfilled' ? statsResponse.value : null,
          recentOrders: recentOrders,
          profile: profileResponse.status === 'fulfilled' ? profileResponse.value : null,
          cart: cartResponse.status === 'fulfilled' ? cartResponse.value : null
        });

      } catch (err) {
        console.error('Dashboard loading error:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getOrderStatusClass = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'pending': return 'pending';
      case 'processing': return 'processing';
      case 'delivered': return 'delivered';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  };

  if (!user) {
    return (
      <main className="dashboard-main">
        <div className="dashboard-container">
          <div className="error-message">
            Please <Link to="/loginSignUp">log in</Link> to access your dashboard.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">Dashboard</h2>
        <div className="row">
          <div className="col-lg-3">
            <ul className="account-nav">
              <li><Link to="/account-dashboard" className="menu-link menu-link_active">Dashboard</Link></li>
              <li><Link to="/account-orders" className="menu-link">Orders</Link></li>
              <li><Link to="/account-address" className="menu-link">Addresses</Link></li>
              <li><Link to="/account-details" className="menu-link">Account Details</Link></li>
              <li><Link to="/account-wishlist" className="menu-link">Wishlist</Link></li>
              <li><Link to="/logout" className="menu-link">Logout</Link></li>
            </ul>
          </div>
          <div className="col-lg-9">
            <div className="page-content my-account__dashboard">
              {loading ? (
                <div className="loading-message">Loading dashboard...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="stats-grid">
                    <div className="stat-card orders">
                      <div className="stat-header">
                        <div className="stat-icon orders">📦</div>
                      </div>
                      <div className="stat-value">
                        {dashboardData.stats?.totalOrders || 0}
                      </div>
                      <div className="stat-label">Total Orders</div>
                    </div>

                    <div className="stat-card spent">
                      <div className="stat-header">
                        <div className="stat-icon spent">💰</div>
                      </div>
                      <div className="stat-value">
                        {formatCurrency(dashboardData.stats?.totalSpent || 0)}
                      </div>
                      <div className="stat-label">Total Spent</div>
                    </div>

                    <div className="stat-card cart">
                      <div className="stat-header">
                        <div className="stat-icon cart">🛒</div>
                      </div>
                      <div className="stat-value">
                        {dashboardData.cart?.totalItems || 0}
                      </div>
                      <div className="stat-label">Items in Cart</div>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="content-section">
                    <h3 className="section-title">Recent Orders</h3>
                    {dashboardData.recentOrders.length > 0 ? (
                      <ul className="recent-orders-list">
                        {dashboardData.recentOrders.map((order) => (
                          <li key={order.id} className="order-item">
                            <div className="order-info">
                              <div className="order-number">
                                Order #{order.order_number || order.id}
                              </div>
                              <div className="order-date">
                                {formatDate(order.created_at)}
                              </div>
                            </div>
                            <div className={`order-status ${getOrderStatusClass(order.status)}`}>
                              {order.status}
                            </div>
                            <div className="order-amount">
                              {formatCurrency(order.grand_total, order.currency)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="empty-message">
                        No orders yet. <Link to="/shop">Start shopping!</Link>
                      </div>
                    )}
                    {dashboardData.recentOrders.length > 0 && (
                      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <Link to="/account-orders" className="action-btn secondary">
                          View All Orders
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Profile Summary */}
                  <div className="content-section">
                    <h3 className="section-title">Profile Summary</h3>
                    <div className="profile-summary">
                      <div className="profile-avatar">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="profile-info">
                        <h3>{user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}</h3>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                        <p><strong>Member since:</strong> {user.created_at ? formatDate(user.created_at) : 'Recently'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="content-section">
                    <h3 className="section-title">Quick Actions</h3>
                    <div className="quick-actions">
                      <Link to="/shop" className="action-btn">
                        🛍️ Continue Shopping
                      </Link>
                      <Link to="/cart" className="action-btn secondary">
                        🛒 View Cart ({dashboardData.cart?.totalItems || 0})
                      </Link>
                      <Link to="/account-orders" className="action-btn secondary">
                        📋 View Orders
                      </Link>
                      <Link to="/account-details" className="action-btn success">
                        ⚙️ Account Settings
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AccountDashboard;