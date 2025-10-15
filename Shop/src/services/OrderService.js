// Frontend/src/services/OrderService.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

class OrderService {
  
  // Get authentication token from storage
  static getAuthToken() {
    // Try to get token from sessionStorage (authToken)
    const authToken = sessionStorage.getItem("authToken");
    if (authToken) {
      return authToken;
    }

    // Fallback: try to get from user object
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.token || localStorage.getItem("token");
  }

  // Create a new order
  static async createOrder(orderData) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create order');
    }

    return data.data;
  }

  // Get user's order history
  static async getUserOrders() {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch orders');
    }

    return data.data;
  }

  // Get specific order by ID
  static async getOrder(orderId) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch order');
    }

    return data.data;
  }

  // Cancel an order
  static async cancelOrder(orderId) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel order');
    }

    return data.data;
  }

  // Get orders by status
  static async getOrdersByStatus(status) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/orders/status/${status}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch orders');
    }

    return data.data;
  }

  // Transform cart items to order format
  static transformCartItemsToOrder(cartItems) {
    return cartItems.map(item => ({
      product_id: item.productID || null,
      variant_id: item.variantID || null,
      product_name_snapshot: item.productName || '',
      unit_price: parseFloat(item.productPrice) || 0,
      quantity: parseInt(item.quantity) || 1,
      front_img_snapshot: item.frontImg || null,
      back_img_snapshot: item.backImg || null,
      reviews_text_snapshot: item.productReviews || null
    }));
  }

  // Build order payload from cart and checkout data
  static buildOrderPayload(cartItems, shippingAddress, paymentMethod, totals, userInfo) {
    const items = this.transformCartItemsToOrder(cartItems);

    const shipping_address = shippingAddress ? {
      full_name: userInfo?.displayName || [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(" ") || "Customer",
      phone: userInfo?.phone || "",
      line1: shippingAddress.line1 || shippingAddress.address_line || "",
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city || "",
      state: shippingAddress.state || null,
      postal_code: shippingAddress.postal_code || shippingAddress.postcode || "",
      country_code: (shippingAddress.country_code || shippingAddress.country || "BD").toString().slice(0, 2)
    } : null;

    return {
      items,
      shipping_address,
      payment_method: paymentMethod,
      currency: totals.currency || "BDT",
      subtotal: parseFloat(totals.subtotal) || 0,
      discount_total: parseFloat(totals.discount_total) || 0,
      tax_total: parseFloat(totals.tax_total) || 0,
      shipping_total: parseFloat(totals.shipping_total) || 0,
      grand_total: parseFloat(totals.grand_total) || 0
    };
  }
}

export default OrderService;