// Frontend/src/services/WishlistService.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

class WishlistService {
  // Get authentication token
  getAuthToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  }

  /**
   * Get user's wishlist items
   */
  async getWishlist() {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/wishlist`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(productId, variantId = null) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId, variantId = null) {
    try {
      const token = this.getAuthToken();
      const url = new URL(`${API_BASE}/api/v1/wishlist/${productId}`);
      if (variantId) {
        url.searchParams.append('variant_id', variantId);
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  /**
   * Check if product is in wishlist
   */
  async checkWishlistStatus(productId) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/wishlist/check/${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return { in_wishlist: false };
    }
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist() {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${API_BASE}/api/v1/wishlist`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      throw error;
    }
  }

  /**
   * Toggle wishlist status for a product
   */
  async toggleWishlist(productId, variantId = null) {
    try {
      const status = await this.checkWishlistStatus(productId);
      
      if (status.in_wishlist) {
        await this.removeFromWishlist(productId, variantId);
        return { in_wishlist: false, action: 'removed' };
      } else {
        await this.addToWishlist(productId, variantId);
        return { in_wishlist: true, action: 'added' };
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      throw error;
    }
  }
}

const wishlistService = new WishlistService();
export default wishlistService;