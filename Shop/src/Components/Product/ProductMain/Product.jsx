//Frontend/src/Components/Product/ProductMain/Product.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";

import { useDispatch, useSelector } from "react-redux";
import { addToCart, addToCartServer } from "../../../Features/Cart/cartSlice";

import { GoChevronLeft } from "react-icons/go";
import { GoChevronRight } from "react-icons/go";
import { FaStar } from "react-icons/fa";
import { FiHeart } from "react-icons/fi";
import { PiShareNetworkLight } from "react-icons/pi";

import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { formatPrice } from "../../../utils/currency";

import "./Product.css";

const Product = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Product images Gallery
  const [currentImg, setCurrentImg] = useState(0);

  const prevImg = () => {
    if (product && product.images) {
      setCurrentImg(currentImg === 0 ? product.images.length - 1 : currentImg - 1);
    }
  };

  const nextImg = () => {
    if (product && product.images) {
      setCurrentImg(currentImg === product.images.length - 1 ? 0 : currentImg + 1);
    }
  };

  // Product Quantity
  const [quantity, setQuantity] = useState(1);

  const increment = () => {
    setQuantity(quantity + 1);
  };

  const decrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleInputChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
    }
  };

  // Product WishList
  const [clicked, setClicked] = useState(false);

  const handleWishClick = () => {
    setClicked(!clicked);
  };

  // Product Colors - will be dynamic based on variants
  const [highlightedColor, setHighlightedColor] = useState("#222222");

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) {
        setError("No product slug provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/api/v1/products/${slug}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          // Transform the product data for the frontend
          const transformedProduct = {
            id: data.data.id,
            name: data.data.name,
            slug: data.data.slug,
            description: data.data.description,
            price: parseFloat(data.data.price || 0),
            category: data.data.category_name || 'Uncategorized',
            brand: data.data.brand_name || '',
            images: data.data.images?.map(img => 
              img.url.startsWith('http') ? img.url : `http://localhost:4000${img.url}`
            ) || ["https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
            variants: data.data.variants || [],
            reviews: data.data.reviews || [],
            avg_rating: data.data.avg_rating || 0,
            review_count: data.data.review_count || 0,
            tags: data.data.tags ? (typeof data.data.tags === 'string' ? JSON.parse(data.data.tags) : data.data.tags) : []
          };
          
          setProduct(transformedProduct);
          setError(null);
        } else {
          throw new Error('Product not found');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Product Detail to Redux
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const isAuthenticated = useSelector((state) => state.cart.isAuthenticated);

  const handleAddToCart = () => {
    if (!product) return;

    // Use the first available variant or create a default one
    const selectedVariant = product.variants && product.variants.length > 0 
      ? product.variants[0] 
      : null;

    const productDetails = {
      productID: product.id,
      productName: product.name,
      productPrice: selectedVariant ? parseFloat(selectedVariant.price) : product.price,
      frontImg: product.images[0],
      productReviews: `${product.review_count}+ reviews`,
      variantID: selectedVariant ? selectedVariant.id : null,
      slug: product.slug
    };

    const productInCart = cartItems.find(
      (item) => item.productID === productDetails.productID
    );

    if (productInCart && productInCart.quantity >= 20) {
      toast.error("Product limit reached", {
        duration: 2000,
        style: {
          backgroundColor: "#ff4b4b",
          color: "white",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#ff4b4b",
        },
      });
    } else {
      // Check if user is authenticated for server sync
      if (isAuthenticated && selectedVariant) {
        // Use server-side cart
        dispatch(addToCartServer({ 
          variantId: selectedVariant.id, 
          quantity: quantity 
        }));
      } else {
        // Use local cart
        dispatch(addToCart(productDetails));
      }
      
      toast.success(`Added to cart!`, {
        duration: 2000,
        style: {
          backgroundColor: "#07bc0c",
          color: "white",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#07bc0c",
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="productSection">
        <div className="productShowCase">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="productSection">
        <div className="productShowCase">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Error: {error || 'Product not found'}</p>
            <Link to="/shop">← Back to Shop</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="productSection">
        <div className="productShowCase">
          <div className="productGallery">
            <div className="productThumb">
              {product.images.map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  onClick={() => setCurrentImg(index)} 
                  alt={`${product.name} view ${index + 1}`} 
                />
              ))}
            </div>
            <div className="productFullImg">
              <img src={product.images[currentImg]} alt={product.name} />
              {product.images.length > 1 && (
                <div className="buttonsGroup">
                  <button onClick={prevImg} className="directionBtn">
                    <GoChevronLeft size={18} />
                  </button>
                  <button onClick={nextImg} className="directionBtn">
                    <GoChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="productDetails">
            <div className="productBreadcrumb">
              <div className="breadcrumbLink">
                <Link to="/">Home</Link>&nbsp;/&nbsp;
                <Link to="/shop">The Shop</Link>&nbsp;/&nbsp;
                <span>{product.category}</span>
              </div>
              <div className="prevNextLink">
                <Link to="/shop">
                  <GoChevronLeft />
                  <p>Back to Shop</p>
                </Link>
              </div>
            </div>
            <div className="productName">
              <h1>{product.name}</h1>
            </div>
            <div className="productRating">
              {[...Array(5)].map((_, i) => (
                <FaStar 
                  key={i}
                  color={i < Math.floor(product.avg_rating || 0) ? "#FEC78A" : "#ddd"} 
                  size={10} 
                />
              ))}
              <p>{product.review_count}+ reviews</p>
            </div>
                        <div className="productPrice">
              <h3>{formatPrice(259)}</h3>
            </div>
            <div className="productDescription">
              <p>{product.description || "No description available."}</p>
            </div>
            
            {product.variants && product.variants.length > 0 && (
              <div className="productVariants">
                <p>Available Options:</p>
                <div className="variantOptions">
                  {product.variants.map((variant, index) => (
                    <div key={index} className="variant">
                      {variant.color && <span>Color: {variant.color}</span>}
                      {variant.size && <span>Size: {variant.size}</span>}
                      {variant.price && <span>Price: {formatPrice(variant.price)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="productCartQuantity">
              <div className="productQuantity">
                <button onClick={decrement}>-</button>
                <input
                  type="text"
                  value={quantity}
                  onChange={handleInputChange}
                />
                <button onClick={increment}>+</button>
              </div>
              <div className="productCartBtn">
                <button onClick={handleAddToCart}>Add to Cart</button>
              </div>
            </div>
            <div className="productWishShare">
              <div className="productWishList">
                <button onClick={handleWishClick}>
                  <FiHeart color={clicked ? "red" : ""} size={17} />
                  <p>Add to Wishlist</p>
                </button>
              </div>
              <div className="productShare">
                <PiShareNetworkLight size={22} />
                <p>Share</p>
              </div>
            </div>
            <div className="productTags">
              <p>
                <span>SKU: </span>{product.variants?.[0]?.sku || 'N/A'}
              </p>
              <p>
                <span>CATEGORIES: </span>{product.category}
              </p>
              {product.brand && (
                <p>
                  <span>BRAND: </span>{product.brand}
                </p>
              )}
              {product.tags && product.tags.length > 0 && (
                <p>
                  <span>TAGS: </span>{product.tags.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Product;