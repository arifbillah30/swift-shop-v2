// Frontend/src/services/CartService.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

class CartService {
  
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

  // Get user's cart from server
  static async getCart() {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch cart');
    }

    return data.data;
  }

  // Add item to cart
  static async addToCart(variantId, quantity = 1) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        variant_id: variantId,
        quantity: quantity
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add item to cart');
    }

    return data.data;
  }

  // Update cart item quantity
  static async updateCartItem(itemId, quantity) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/cart/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update cart item');
    }

    return data.data;
  }

  // Remove item from cart
  static async removeFromCart(itemId) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to remove item from cart');
    }

    return data.data;
  }

  // Clear entire cart
  static async clearCart() {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/v1/cart`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to clear cart');
    }

    return data.data;
  }

  // Sync local cart with server
  static async syncCart(localCartItems) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    // Transform local cart items to sync format
    const items = localCartItems.map(item => ({
      variant_id: item.variantID || this.findVariantId(item),
      quantity: item.quantity
    }));

    const response = await fetch(`${API_BASE}/api/v1/cart/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to sync cart');
    }

    return data.data;
  }

  // Helper method to find variant ID from product data
  static findVariantId(item) {
    // For now, we'll assume the first available variant
    // In a real implementation, you might store variant_id with the cart item
    return item.variantID || null;
  }

  // Transform server cart data to frontend format
  static transformServerCartToLocal(serverCart) {
    if (!serverCart || !serverCart.items) {
      return [];
    }

    return serverCart.items.map(item => ({
      productID: item.product_id,
      productName: item.product_name,
      productPrice: parseFloat(item.unit_price_snapshot),
      frontImg: item.primary_image,
      productReviews: `${item.review_count || 0}+ reviews`,
      quantity: item.quantity,
      variantID: item.variant_id,
      cartItemId: item.id, // Server cart item ID for updates/deletes
      slug: item.product_slug,
      color: item.color,
      size: item.size,
      category: item.category_name,
      brand: item.brand_name
    }));
  }

  // Transform local cart item to server format
  static transformLocalCartToServer(localItems) {
    return localItems.map(item => ({
      variant_id: item.variantID,
      quantity: item.quantity
    })).filter(item => item.variant_id); // Only include items with variant IDs
  }
}

export default CartService;