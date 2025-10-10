import React, { useState, useEffect } from "react";
import "./ShopDetails.css";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../../Features/Cart/cartSlice";
import Filter from "../Filters/Filter";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { IoFilterSharp, IoClose } from "react-icons/io5";
import { FaAngleRight, FaAngleLeft } from "react-icons/fa6";
import { FaCartPlus } from "react-icons/fa";
import toast from "react-hot-toast";

const ShopDetails = () => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 500]); // Default price range
  const [sortOption, setSortOption] = useState("default");

  const [wishList, setWishList] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Updated to use correct port and endpoint
        const response = await fetch('http://localhost:4000/products');
        if (!response.ok) {
          // If API fails, use mock data
          console.log('API failed, using mock data');
          const mockProducts = [
            {
              id: 1,
              name: "iPhone 15 Pro",
              slug: "iphone-15-pro", 
              price: "99999.00",
              primary_image: "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png",
              category_name: "Electronics",
              avg_rating: 4.5,
              review_count: 25,
              // Transform to match frontend expectations
              product_id: 1,
              product_name: "iPhone 15 Pro",
              price: "999.99",
              images: ["https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
              categories: "Electronics",
              total_review: 25
            },
            {
              id: 2,
              name: "Nike Air Max 270",
              slug: "nike-air-max-270",
              price: "12000.00", 
              primary_image: "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png",
              category_name: "Sports",
              avg_rating: 4.3,
              review_count: 18,
              // Transform to match frontend expectations
              product_id: 2,
              product_name: "Nike Air Max 270",
              price: "120.00",
              images: ["https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
              categories: "Sports", 
              total_review: 18
            },
            {
              id: 3,
              name: "Samsung Galaxy S24",
              slug: "samsung-galaxy-s24",
              price: "85000.00",
              primary_image: "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png", 
              category_name: "Electronics",
              avg_rating: 4.4,
              review_count: 32,
              // Transform to match frontend expectations
              product_id: 3,
              product_name: "Samsung Galaxy S24",
              price: "850.00",
              images: ["https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
              categories: "Electronics",
              total_review: 32
            }
          ];
          setProducts(mockProducts);
          return;
        }
        
        const data = await response.json();
        console.log('Product Data:', data);
        
        // Transform API data to match frontend expectations
        if (data.products) {
          const transformedProducts = data.products.map(product => ({
            product_id: product.id,
            product_name: product.name,
            price: (parseFloat(product.price) / 100).toFixed(2), // Convert from cents to dollars
            images: [product.primary_image || "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
            categories: product.category_name,
            total_review: product.review_count || 0
          }));
          setProducts(transformedProducts);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to mock data on error
        const mockProducts = [
          {
            product_id: 1,
            product_name: "iPhone 15 Pro",
            price: "999.99",
            images: ["https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
            categories: "Electronics",
            total_review: 25
          },
          {
            product_id: 2,
            product_name: "Nike Air Max 270", 
            price: "120.00",
            images: ["https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"],
            categories: "Sports",
            total_review: 18
          }
        ];
        setProducts(mockProducts);
      }
    };
  
    fetchProducts();
  }, []);


  // filer


  const handleSortChange = (event) => {
    setSortOption(event.target.value); // Update sort option based on user selection
  };


  const handlePriceChange = (newPriceRange) => {
    setPriceRange(newPriceRange);
  };

  const filteredProducts = products.filter((product) => {
    const price = parseFloat(product.price);
    return price >= priceRange[0] && price <= priceRange[1];
  });


  // Sorting logic
  let sortedProducts = [...filteredProducts];
  if (sortOption === "a-z") {
    sortedProducts.sort((a, b) => a.product_name.localeCompare(b.product_name));
  } else if (sortOption === "z-a") {
    sortedProducts.sort((a, b) => b.product_name.localeCompare(a.product_name));
  } else if (sortOption === "lowToHigh") {
    sortedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else if (sortOption === "highToLow") {
    sortedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  }
  
  

  const handleWishlistClick = (productID) => {
    setWishList((prevWishlist) => ({
      ...prevWishlist,
      [productID]: !prevWishlist[productID],
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const cartItems = useSelector((state) => state.cart.items);

  const handleAddToCart = (product) => {

    const productDetails = {
      productID: product.product_id,
      productName: product.product_name,
      productPrice: parseFloat(product.price),
      frontImg: product.images[0],
      productReviews: product.total_review + "K+ reviews",
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
      dispatch(addToCart(productDetails));
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

  return (
    <>
      <div className="shopDetails">
        <div className="shopDetailMain">
          <div className="shopDetails__left">
          <Filter onPriceChange={handlePriceChange} /> {/* Pass handler here */}
          </div>
          <div className="shopDetails__right">
            <div className="shopDetailsSorting">
              <div className="shopDetailsBreadcrumbLink">
                <Link to="/" onClick={scrollToTop}>
                  Home
                </Link>
                &nbsp;/&nbsp;
                <Link to="/shop">The Swift Shop</Link>
              </div>
              <div className="filterLeft" onClick={toggleDrawer}>
                <IoFilterSharp />
                <p>Filter</p>
              </div>
              <div className="shopDetailsSort">
                <select name="sort" id="sort" onChange={handleSortChange}>
                  <option value="default">Default Sorting</option>
                  <option value="a-z">Alphabetically, A-Z</option>
                  <option value="z-a">Alphabetically, Z-A</option>
                  <option value="lowToHigh">Price, Low to high</option>
                  <option value="highToLow">Price, high to low</option>
                </select>
                <div className="filterRight" onClick={toggleDrawer}>
                  <div className="filterSeprator"></div>
                  <IoFilterSharp />
                  <p>Filter</p>
                </div>
              </div>
            </div>
            
            <div className="shopDetailsProducts">
  <div className="shopDetailsProductsContainer">
    {sortedProducts.length > 0 ? (
      sortedProducts.map((product) => (
        <div className="sdProductContainer" key={product.product_id}>
          <div className="sdProductImages">
            <Link to="/Product" onClick={scrollToTop}>
              <img
                src={product.images[0]} //  first image is the main one
                alt={product.product_name}
                className="sdProduct_front"
              />
              {product.images[1] && (
                <img
                  src={product.images[1]}
                  alt={product.product_name}
                  className="sdProduct_back"
                />
              )}
            </Link>
            <h4 onClick={() => handleAddToCart(product)}>Add to Cart</h4>
          </div>
          <div
            className="sdProductImagesCart"
            onClick={() => handleAddToCart(product)}
          >
            <FaCartPlus />
          </div>
          <div className="sdProductInfo">
            <div className="sdProductCategoryWishlist">
              <p>{product.categories}</p>
              <FiHeart
                onClick={() => handleWishlistClick(product.product_id)}
                style={{
                  color: wishList[product.product_id] ? "red" : "#767676",
                  cursor: "pointer",
                }}
              />
            </div>
            <div className="sdProductNameInfo">
              <Link to="/product" onClick={scrollToTop}>
                <h5>{product.product_name}</h5>
              </Link>
              <p>${product.price}</p>
              <div className="sdProductRatingReviews">
                <div className="sdProductRatingStar">
                  <FaStar color="#FEC78A" size={10} />
                  <FaStar color="#FEC78A" size={10} />
                  <FaStar color="#FEC78A" size={10} />
                  <FaStar color="#FEC78A" size={10} />
                  <FaStar color="#FEC78A" size={10} />
                </div>
                <span>({product.total_review} K)</span>
              </div>
            </div>
          </div>
        </div>
      ))
    ) : (
      <p>No products found.</p>
    )}
  </div>
</div>

            <div className="shopDetailsPagination">
              <div className="sdPaginationPrev">
                <p onClick={scrollToTop}>
                  <FaAngleLeft />
                  Prev
                </p>
              </div>
              <div className="sdPaginationNumber">
                <div className="paginationNum">
                  <p onClick={scrollToTop}>1</p>
                  <p onClick={scrollToTop}>2</p>
                  <p onClick={scrollToTop}>3</p>
                  <p onClick={scrollToTop}>4</p>
                </div>
              </div>
              <div className="sdPaginationNext">
                <p onClick={scrollToTop}>
                  Next
                  <FaAngleRight />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Drawer */}
      <div className={`filterDrawer ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawerHeader">
          <p>Filter By</p>
          <IoClose onClick={closeDrawer} className="closeButton" size={26} />
        </div>
        <div className="drawerContent">
        <Filter onPriceChange={handlePriceChange} />
        </div>
      </div>
    </>
  );
};

export default ShopDetails;
