// Frontend/src/Components/Dashboard/account-wishlist.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/authContext';
import WishlistService from '../../services/WishlistService';
import CartService from '../../services/CartService';
import './account-wishlist.css';

const AccountWishlist = () => {
  const { authData } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // Get user from auth context or fallback to storage
  const user = useMemo(() => {
    return authData?.user || 
           JSON.parse(sessionStorage.getItem('user') || 'null') ||
           JSON.parse(localStorage.getItem('user') || 'null') ||
           null;
  }, [authData]);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) {
        setError('Please log in to view your wishlist.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await WishlistService.getWishlist();
        setWishlistItems(data.items || []);
      } catch (err) {
        console.error('Failed to load wishlist:', err);
        setError('Failed to load wishlist. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [user]);

  const handleRemoveFromWishlist = async (productId, variantId = null) => {
    const actionKey = `remove-${productId}-${variantId || 'default'}`;
    
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      await WishlistService.removeFromWishlist(productId, variantId);
      
      // Remove item from local state
      setWishlistItems(prev => 
        prev.filter(item => 
          !(item.product_id === productId && 
            (item.variant_id === variantId || (!item.variant_id && !variantId)))
        )
      );
      
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
      alert('Failed to remove item from wishlist. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleAddToCart = async (item) => {
    const actionKey = `cart-${item.product_id}-${item.variant_id || 'default'}`;
    
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      await CartService.addToCart({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: 1
      });
      
      alert('Product added to cart!');
      
      // Optionally remove from wishlist after adding to cart
      // await handleRemoveFromWishlist(item.product_id, item.variant_id);
      
    } catch (err) {
      console.error('Failed to add to cart:', err);
      alert('Failed to add to cart. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleClearWishlist = async () => {
    if (!window.confirm('Are you sure you want to clear your entire wishlist?')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, clearAll: true }));
      await WishlistService.clearWishlist();
      setWishlistItems([]);
    } catch (err) {
      console.error('Failed to clear wishlist:', err);
      alert('Failed to clear wishlist. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, clearAll: false }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  const calculateDiscount = (price, discountPrice) => {
    if (!discountPrice || discountPrice >= price) return 0;
    return Math.round(((price - discountPrice) / price) * 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <main>
        <div className="mb-4 pb-4"></div>
        <section className="my-account container">
          <div className="wishlist-error">
            Please <Link to="/loginSignUp">log in</Link> to access your wishlist.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">Wishlist</h2>
        <div className="row">
          <div className="col-lg-3">
            <ul className="account-nav">
              <li><Link to="/account-dashboard" className="menu-link">Dashboard</Link></li>
              <li><Link to="/account-orders" className="menu-link">Orders</Link></li>
              <li><Link to="/account-address" className="menu-link">Addresses</Link></li>
              <li><Link to="/account-details" className="menu-link">Account Details</Link></li>
              <li><Link to="/account-wishlist" className="menu-link menu-link_active">Wishlist</Link></li>
              <li><Link to="/logout" className="menu-link">Logout</Link></li>
            </ul>
          </div>
          <div className="col-lg-9">
            <div className="page-content my-account__wishlist">
              {loading ? (
                <div className="wishlist-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading your wishlist...</p>
                </div>
              ) : error ? (
                <div className="wishlist-error">{error}</div>
              ) : wishlistItems.length === 0 ? (
                <div className="empty-wishlist">
                  <div className="empty-wishlist-icon">💝</div>
                  <h3>Your wishlist is empty</h3>
                  <p>Save your favorite items here to easily find them later.</p>
                  <Link to="/shop" className="start-shopping-btn">
                    🛍️ Start Shopping
                  </Link>
                </div>
              ) : (
                <>
                  <div className="wishlist-header">
                    <div className="wishlist-stats">
                      <div className="wishlist-count">
                        {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                    <button 
                      className="clear-wishlist-btn"
                      onClick={handleClearWishlist}
                      disabled={actionLoading.clearAll}
                    >
                      {actionLoading.clearAll ? '⏳' : '🗑️'} Clear All
                    </button>
                  </div>

                  <div className="wishlist-grid">
                    {wishlistItems.map((item) => {
                      const discount = calculateDiscount(item.price, item.discount_price);
                      const removeKey = `remove-${item.product_id}-${item.variant_id || 'default'}`;
                      const cartKey = `cart-${item.product_id}-${item.variant_id || 'default'}`;
                      
                      return (
                        <div key={`${item.product_id}-${item.variant_id || 'default'}`} className="wishlist-item">
                          <div className="wishlist-item-added">
                            Added {formatDate(item.added_at)}
                          </div>
                          
                          {item.image ? (
                            <img 
                              src={`${process.env.REACT_APP_API_BASE_URL}/files/products/${item.image}`}
                              alt={item.product_name}
                              className="wishlist-item-image"
                            />
                          ) : (
                            <div className="wishlist-item-image-placeholder">
                              📷
                            </div>
                          )}
                          
                          <div className="wishlist-item-content">
                            <h3 className="wishlist-item-title">{item.product_name}</h3>
                            
                            {item.description && (
                              <p className="wishlist-item-description">{item.description}</p>
                            )}
                            
                            {(item.size || item.color) && (
                              <div className="wishlist-item-variant">
                                {item.size && `Size: ${item.size}`}
                                {item.size && item.color && ' • '}
                                {item.color && `Color: ${item.color}`}
                              </div>
                            )}
                            
                            <div className="wishlist-item-price">
                              <span className="current-price">
                                {formatPrice(item.discount_price || item.price)}
                              </span>
                              {item.discount_price && (
                                <>
                                  <span className="original-price">
                                    {formatPrice(item.price)}
                                  </span>
                                  <span className="discount-badge">
                                    -{discount}%
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <div className={`stock-status ${item.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                              {item.in_stock ? 'In Stock' : 'Out of Stock'}
                            </div>
                            
                            <div className="wishlist-item-actions">
                              <button
                                className="add-to-cart-btn"
                                onClick={() => handleAddToCart(item)}
                                disabled={!item.in_stock || actionLoading[cartKey]}
                              >
                                {actionLoading[cartKey] ? '⏳' : '🛒'} 
                                {actionLoading[cartKey] ? 'Adding...' : 'Add to Cart'}
                              </button>
                              
                              <button
                                className="remove-from-wishlist-btn"
                                onClick={() => handleRemoveFromWishlist(item.product_id, item.variant_id)}
                                disabled={actionLoading[removeKey]}
                                title="Remove from wishlist"
                              >
                                {actionLoading[removeKey] ? '⏳' : '❌'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

export default AccountWishlist;