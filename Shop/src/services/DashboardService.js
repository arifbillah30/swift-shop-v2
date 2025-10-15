// Frontend/src/services/DashboardService.js
import OrderService from './OrderService';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

class DashboardService {
  // Get authentication token
  getAuthToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  }

  // Get user dashboard statistics
  async getDashboardStats() {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/user/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        // Fallback to calculating stats from orders if dashboard endpoint isn't available
        console.warn('Dashboard stats endpoint not available, using fallback');
        return await this.getFallbackStats();
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data
      return await this.getFallbackStats();
    }
  }

  // Fallback method to calculate stats from existing endpoints
  async getFallbackStats() {
    try {
      const orders = await this.getRecentOrders(1000); // Get all orders
      const orderList = orders.orders || [];
      
      const totalOrders = orderList.length;
      const totalSpent = orderList.reduce((sum, order) => sum + (parseFloat(order.grand_total) || 0), 0);
      
      const statusBreakdown = orderList.reduce((acc, order) => {
        const status = order.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Calculate monthly stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyOrders = orderList.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });

      return {
        totalOrders,
        totalSpent,
        monthlyOrders: monthlyOrders.length,
        monthlySpent: monthlyOrders.reduce((sum, order) => sum + (parseFloat(order.grand_total) || 0), 0),
        statusBreakdown: {
          pending: 0,
          processing: 0,
          delivered: 0,
          cancelled: 0,
          ...statusBreakdown
        }
      };
    } catch (error) {
      console.error('Fallback stats calculation failed:', error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        monthlyOrders: 0,
        monthlySpent: 0,
        statusBreakdown: {
          pending: 0,
          processing: 0,
          delivered: 0,
          cancelled: 0
        }
      };
    }
  }

  // Get recent orders for dashboard
  async getRecentOrders(limit = 5) {
    try {
      // Use the existing OrderService
      const orders = await OrderService.getUserOrders();
      const orderList = orders.orders || orders || [];
      
      // Limit the results and return in the expected format
      const limitedOrders = orderList.slice(0, limit);
      
      return {
        orders: limitedOrders,
        total: limitedOrders.length
      };
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      // Return empty result instead of throwing to prevent dashboard from failing
      return {
        orders: [],
        total: 0
      };
    }
  }

  // Get user profile summary
  async getProfileSummary() {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        // Fallback to session/local storage user data
        const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
        return { user };
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching profile summary:', error);
      // Fallback to stored user data
      const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
      return { user };
    }
  }

  // Get cart summary
  async getCartSummary() {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/cart`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        return { totalItems: 0, cartTotal: 0 };
      }

      const result = await response.json();
      const cartData = result.data || result;
      
      // Calculate total items from cart data
      const totalItems = cartData.items ? cartData.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
      const cartTotal = cartData.items ? cartData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0) : 0;
      
      return {
        totalItems,
        cartTotal,
        ...cartData
      };
    } catch (error) {
      console.error('Error fetching cart summary:', error);
      return { totalItems: 0, cartTotal: 0 };
    }
  }
}

const dashboardService = new DashboardService();
export default dashboardService;