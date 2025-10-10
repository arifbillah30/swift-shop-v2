// Frontend/src/Components/ShoppingCart/ShoppingCart.jsx

import React, { useEffect, useMemo, useState } from "react";
import "./ShoppingCart.css";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  updateQuantity,
  selectCartTotalAmount,
} from "../../Features/Cart/cartSlice";
import { MdOutlineClose } from "react-icons/md";
import { Link } from "react-router-dom";
import success from "../../Assets/success.png";
import { useAuth } from "../../Context/authContext";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";
const SHIPPING_FEE = 5;
const VAT_FEE = 11;

const ShoppingCart = () => {
  const { authData } = useAuth();

  const cartItems = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("cartTab1");
  const [payments, setPayments] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("Direct Bank Transfer");

  // shipping address (from /addresses/:email/shipping)
  const [shippingAddress, setShippingAddress] = useState(null);

  const handleTabClick = (tab) => {
    if (tab === "cartTab1" || cartItems.length > 0) {
      setActiveTab(tab);
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    if (quantity >= 1 && quantity <= 20) {
      dispatch(updateQuantity({ productID: productId, quantity }));
    }
  };

  const totalPrice = useSelector(selectCartTotalAmount);
  const grandTotal = useMemo(() => {
    if (totalPrice <= 0) return 0;
    return totalPrice + SHIPPING_FEE + VAT_FEE;
  }, [totalPrice]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // current Date
  const currentDate = new Date();
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Random number for UI only (backend will create order_number)
  const orderNumber = Math.floor(Math.random() * 100000);

  const handlePaymentChange = (e) => setSelectedPayment(e.target.value);

  // Fetch shipping address snapshot for signed-in user
  useEffect(() => {
    const email = authData?.user?.email;
    if (!email) {
      setShippingAddress(null);
      return;
    }

    (async () => {
      try {
        // try specific shipping endpoint first
        const res = await fetch(`${API_BASE}/addresses/${encodeURIComponent(email)}/shipping`);
        const data = await res.json();

        if (res.ok && data?.success && data?.data) {
          setShippingAddress(data.data);
          return;
        }

        // fallback: fetch all and pick shipping
        const resAll = await fetch(`${API_BASE}/addresses/${encodeURIComponent(email)}`);
        const all = await resAll.json();
        if (resAll.ok && all?.success && Array.isArray(all.data)) {
          const found = all.data.find((a) => a.address_type === "shipping") || null;
          setShippingAddress(found);
        } else {
          setShippingAddress(null);
        }
      } catch (e) {
        console.error("Failed to fetch shipping address:", e);
        setShippingAddress(null);
      }
    })();
  }, [authData?.user?.email]);

  // Build payload & create order against normalized backend
  const handleCreateOrder = async () => {
    const user = JSON.parse(sessionStorage.getItem("user")) || authData?.user;
    if (!user?.email) {
      alert("Please sign in to place an order.");
      return;
    }

    // Map cart items to order_items snapshot
    const items = cartItems.map((ci) => ({
      // If you have real product/variant IDs, pass them here; otherwise nulls are OK
      product_id: ci.productID || null,
      variant_id: ci.variantID || null,
      product_name_snapshot: ci.productName,
      unit_price: Number(ci.productPrice) || 0,
      quantity: Number(ci.quantity) || 1,
      front_img_snapshot: ci.frontImg || null,
      back_img_snapshot: ci.backImg || null,
      reviews_text_snapshot: ci.productReviews || null,
    }));

    const shippingAddrPayload = shippingAddress
      ? {
          address_type: "shipping",
          full_name: [authData?.user?.firstName, authData?.user?.lastName].filter(Boolean).join(" ") || null,
          phone: authData?.user?.phone || null,
          line1: shippingAddress.line1 || shippingAddress.address_line || "",
          line2: shippingAddress.line2 || null,
          city: shippingAddress.city || "",
          state: shippingAddress.state || null,
          postal_code: shippingAddress.postal_code || shippingAddress.postcode || "",
          country_code: (shippingAddress.country_code || shippingAddress.country || "BD").toString().slice(0, 2),
        }
      : null;

    // Totals (frontend snapshot)
    const monetary = {
      currency: "BDT", // adjust if you truly charge in GBP
      subtotal: Number(totalPrice) || 0,
      discount_total: 0,
      tax_total: totalPrice > 0 ? VAT_FEE : 0,
      shipping_total: totalPrice > 0 ? SHIPPING_FEE : 0,
      grand_total: Number(grandTotal) || 0,
    };

    const payload = {
      user_email: user.email,
      payment_method: selectedPayment,
      ...monetary,
      items,
      shipping_address: shippingAddrPayload, // backend can treat it as snapshot
    };

    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        console.error("Create order failed:", result);
        alert(result?.message || "Failed to create order.");
        return;
      }

      // success: advance to confirmation
      handleTabClick("cartTab3");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setPayments(true);
    } catch (error) {
      console.error("Error creating order:", error);
      alert("An error occurred while creating the order.");
    }
  };

  return (
    <div>
      <div className="shoppingCartSection">
        <h2>Cart</h2>

        <div className="shoppingCartTabsContainer">
          <div className={`shoppingCartTabs ${activeTab}`}>
            <button
              className={activeTab === "cartTab1" ? "active" : ""}
              onClick={() => {
                handleTabClick("cartTab1");
                setPayments(false);
              }}
            >
              <div className="shoppingCartTabsNumber">
                <h3>01</h3>
                <div className="shoppingCartTabsHeading">
                  <h3>Shopping Bag</h3>
                  <p>Manage Your Items List</p>
                </div>
              </div>
            </button>
            <button
              className={activeTab === "cartTab2" ? "active" : ""}
              onClick={() => {
                handleTabClick("cartTab2");
                setPayments(false);
              }}
              disabled={cartItems.length === 0}
            >
              <div className="shoppingCartTabsNumber">
                <h3>02</h3>
                <div className="shoppingCartTabsHeading">
                  <h3>Shipping and Checkout</h3>
                  <p>Checkout Your Items List</p>
                </div>
              </div>
            </button>
            <button
              className={activeTab === "cartTab3" ? "active" : ""}
              onClick={() => {
                handleTabClick("cartTab3");
              }}
              disabled={cartItems.length === 0 || payments === false}
            >
              <div className="shoppingCartTabsNumber">
                <h3>03</h3>
                <div className="shoppingCartTabsHeading">
                  <h3>Confirmation</h3>
                  <p>Review And Submit Your Order</p>
                </div>
              </div>
            </button>
          </div>

          <div className="shoppingCartTabsContent">
            {/* tab1 */}
            {activeTab === "cartTab1" && (
              <div className="shoppingBagSection">
                <div className="shoppingBagTableSection">
                  {/* Desktop */}
                  <table className="shoppingBagTable">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th></th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.length > 0 ? (
                        cartItems.map((item) => (
                          <tr key={item.productID}>
                            <td data-label="Product">
                              <div className="shoppingBagTableImg">
                                <Link to="/product" onClick={scrollToTop}>
                                  <img src={item.frontImg} alt="" />
                                </Link>
                              </div>
                            </td>
                            <td data-label="">
                              <div className="shoppingBagTableProductDetail">
                                <Link to="/product" onClick={scrollToTop}>
                                  <h4>{item.productName}</h4>
                                </Link>
                                <p>{item.productReviews}</p>
                              </div>
                            </td>
                            <td data-label="Price" style={{ textAlign: "center" }}>
                              £{item.productPrice}
                            </td>
                            <td data-label="Quantity">
                              <div className="ShoppingBagTableQuantity">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(item.productID, item.quantity - 1)
                                  }
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  min="1"
                                  max="20"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.productID,
                                      parseInt(e.target.value, 10) || 1
                                    )
                                  }
                                />
                                <button
                                  onClick={() =>
                                    handleQuantityChange(item.productID, item.quantity + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td data-label="Subtotal">
                              <p style={{ textAlign: "center", fontWeight: "500" }}>
                                £{(Number(item.quantity) * Number(item.productPrice)).toFixed(2)}
                              </p>
                            </td>
                            <td data-label="">
                              <MdOutlineClose
                                onClick={() => dispatch(removeFromCart(item.productID))}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6">
                            <div className="shoppingCartEmpty">
                              <span>Your cart is empty!</span>
                              <Link to="/shop" onClick={scrollToTop}>
                                <button>Shop Now</button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <th
                        colSpan="6"
                        className="shopCartFooter"
                        style={{ borderBottom: "none", padding: "20px 0px" }}
                      >
                        {cartItems.length > 0 && (
                          <div className="shopCartFooterContainer">
                            <form>
                              <input type="text" placeholder="Coupon Code" />
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                Apply Coupon
                              </button>
                            </form>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                              className="shopCartFooterbutton"
                            >
                              Update Cart
                            </button>
                          </div>
                        )}
                      </th>
                    </tfoot>
                  </table>

                  {/* Mobile */}
                  <div className="shoppingBagTableMobile">
                    {cartItems.length > 0 ? (
                      <>
                        {cartItems.map((item) => (
                          <div key={item.productID}>
                            <div className="shoppingBagTableMobileItems">
                              <div className="shoppingBagTableMobileItemsImg">
                                <Link to="/product" onClick={scrollToTop}>
                                  <img src={item.frontImg} alt="" />
                                </Link>
                              </div>
                              <div className="shoppingBagTableMobileItemsDetail">
                                <div className="shoppingBagTableMobileItemsDetailMain">
                                  <Link to="/product" onClick={scrollToTop}>
                                    <h4>{item.productName}</h4>
                                  </Link>
                                  <p>{item.productReviews}</p>
                                  <div className="shoppingBagTableMobileQuantity">
                                    <button
                                      onClick={() =>
                                        handleQuantityChange(item.productID, item.quantity - 1)
                                      }
                                    >
                                      -
                                    </button>
                                    <input
                                      type="text"
                                      min="1"
                                      max="20"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleQuantityChange(
                                          item.productID,
                                          parseInt(e.target.value, 10) || 1
                                        )
                                      }
                                    />
                                    <button
                                      onClick={() =>
                                        handleQuantityChange(item.productID, item.quantity + 1)
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span>£{item.productPrice}</span>
                                </div>
                                <div className="shoppingBagTableMobileItemsDetailTotal">
                                  <MdOutlineClose
                                    size={20}
                                    onClick={() => dispatch(removeFromCart(item.productID))}
                                  />
                                  <p>
                                    £{(Number(item.quantity) * Number(item.productPrice)).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="shopCartFooter">
                          <div className="shopCartFooterContainer">
                            <form>
                              <input type="text" placeholder="Coupon Code" />
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                }}
                              >
                                Apply Coupon
                              </button>
                            </form>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                              className="shopCartFooterbutton"
                            >
                              Update Cart
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="shoppingCartEmpty">
                        <span>Your cart is empty!</span>
                        <Link to="/shop" onClick={scrollToTop}>
                          <button>Shop Now</button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shoppingBagTotal">
                  <h3>Cart Totals</h3>
                  <table className="shoppingBagTotalTable">
                    <tbody>
                      <tr>
                        <th>Subtotal</th>
                        <td>£{totalPrice.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <th>Shipping</th>
                        <td>
                          <div className="shoppingBagTotalTableCheck">
                            <p>£{(totalPrice === 0 ? 0 : SHIPPING_FEE).toFixed(2)}</p>
                            <p>Ship to United Kingdom</p>
                            <p onClick={scrollToTop} style={{ cursor: "pointer" }}>
                              CHANGE ADDRESS
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>VAT</th>
                        <td>£{(totalPrice === 0 ? 0 : VAT_FEE).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <th>Total</th>
                        <td>£{(totalPrice === 0 ? 0 : grandTotal).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <button
                    onClick={() => {
                      handleTabClick("cartTab2");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={cartItems.length === 0}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}

            {/* tab2 */}
            {activeTab === "cartTab2" && (
              <div className="checkoutSection">
                <div className="checkoutDetailsSection">
                  <h4>Shipping Address</h4>
                  <div className="checkoutDetailsForm">
                    <form>
                      {authData?.user ? (
                        <>
                          <div className="checkoutDetailsFormRow">
                            <input
                              type="text"
                              placeholder="First Name"
                              value={authData.user.firstName || ""}
                              readOnly
                            />
                            <input
                              type="text"
                              placeholder="Last Name"
                              value={authData.user.lastName || ""}
                              readOnly
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Company Name (optional)"
                            defaultValue={authData.user.companyName || ""}
                          />

                          {/* Show shipping snapshot if available, otherwise fallback to user fields */}
                          <input
                            type="text"
                            placeholder="Street Address*"
                            defaultValue={
                              shippingAddress?.line1 ||
                              shippingAddress?.address_line ||
                              authData.user.address ||
                              ""
                            }
                          />
                          <input
                            type="text"
                            placeholder="Town / City *"
                            defaultValue={shippingAddress?.city || authData.user.city || ""}
                          />
                          <input
                            type="text"
                            placeholder="Postcode / ZIP *"
                            defaultValue={
                              shippingAddress?.postal_code ||
                              shippingAddress?.postcode ||
                              authData.user.postcode ||
                              ""
                            }
                          />
                          <input
                            type="text"
                            placeholder="Phone *"
                            defaultValue={authData.user.phone || ""}
                          />
                          <input
                            type="email"
                            placeholder="Your Mail *"
                            defaultValue={authData.user.email || ""}
                            readOnly
                          />

                          <textarea cols={30} rows={8} placeholder="Order Notes (Optional)"></textarea>
                        </>
                      ) : (
                        <>
                          <div className="checkoutDetailsFormRow">
                            <input type="text" placeholder="First Name" required />
                            <input type="text" placeholder="Last Name" required />
                          </div>
                          <input type="text" placeholder="Company Name (optional)" />
                          <select name="country" id="country" required defaultValue="">
                            <option value="" disabled>
                              Country / Region
                            </option>
                            <option value="Bangladesh">Bangladesh</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="United States">United States</option>
                          </select>
                          <input type="text" placeholder="Street Address*" required />
                          <input type="text" placeholder="Town / City *" required />
                          <input type="text" placeholder="Postcode / ZIP *" required />
                          <input type="text" placeholder="Phone *" required />
                          <input type="email" placeholder="Your Mail *" required />
                          <div className="checkoutDetailsFormCheck">
                            <label>
                              <input type="checkbox" />
                              <p>Create An Account?</p>
                            </label>
                            <label>
                              <input type="checkbox" />
                              <p>Ship to a different Address</p>
                            </label>
                          </div>
                          <textarea cols={30} rows={8} placeholder="Order Notes (Optional)" />
                        </>
                      )}
                    </form>
                  </div>
                </div>

                <div className="checkoutPaymentSection">
                  <div className="checkoutTotalContainer">
                    <h3>Your Order</h3>
                    <div className="checkoutItems">
                      <table>
                        <thead>
                          <tr>
                            <th>PRODUCTS</th>
                            <th>SUBTOTALS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartItems.map((items) => {
                            const qty = Number(items.quantity) || 0;
                            const price = Number(items.productPrice) || 0;
                            return (
                              <tr key={items.productID}>
                                <td>
                                  {items.productName} x {qty}
                                </td>
                                <td>£{(price * qty).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="checkoutTotal">
                      <table>
                        <tbody>
                          <tr>
                            <th>Subtotal</th>
                            <td>£{totalPrice.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Shipping</th>
                            <td>£{(totalPrice === 0 ? 0 : SHIPPING_FEE).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>VAT</th>
                            <td>£{(totalPrice === 0 ? 0 : VAT_FEE).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Total</th>
                            <td>£{(totalPrice === 0 ? 0 : grandTotal).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="checkoutPaymentContainer">
                    <label>
                      <input
                        type="radio"
                        name="payment"
                        value="Cash on delivery"
                        checked={selectedPayment === "Cash on delivery"}
                        onChange={handlePaymentChange}
                      />
                      <div className="checkoutPaymentMethod">
                        <span>Cash on delivery</span>
                        <p>
                          Phasellus sed volutpat orci. Fusce eget lore mauris vehicula elementum
                          gravida nec dui. Aenean aliquam varius ipsum, non ultricies tellus sodales
                          eu. Donec dignissim viverra nunc, ut aliquet magna posuere eget.
                        </p>
                      </div>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="payment"
                        value="Visa"
                        checked={selectedPayment === "Visa"}
                        onChange={handlePaymentChange}
                      />
                      <div className="checkoutPaymentMethod">
                        <span>Visa, MasterCard & Others</span>
                        <p>
                          Phasellus sed volutpat orci. Fusce eget lore mauris vehicula elementum
                          gravida nec dui. Aenean aliquam varius ipsum, non ultricies tellus sodales
                          eu. Donec dignissim viverra nunc, ut aliquet magna posuere eget.
                        </p>
                      </div>
                    </label>
                    <div className="policyText">
                      Your personal data will be used to process your order, support your experience
                      throughout this website, and for other purposes described in our{" "}
                      <Link to="/terms" onClick={scrollToTop}>
                        Privacy Policy
                      </Link>
                      .
                    </div>
                  </div>

                  <button onClick={handleCreateOrder}>Place Order</button>
                </div>
              </div>
            )}

            {/* tab3 */}
            {activeTab === "cartTab3" && (
              <div className="orderCompleteSection">
                <div className="orderComplete">
                  <div className="orderCompleteMessage">
                    <div className="orderCompleteMessageImg">
                      <img src={success} alt="" />
                    </div>
                    <h3>Your order is completed!</h3>
                    <p>Thank you. Your order has been received.</p>
                  </div>
                  <div className="orderInfo">
                    <div className="orderInfoItem">
                      <p>Order Number</p>
                      <h4>{orderNumber}</h4>
                    </div>
                    <div className="orderInfoItem">
                      <p>Date</p>
                      <h4>{formatDate(currentDate)}</h4>
                    </div>
                    <div className="orderInfoItem">
                      <p>Total</p>
                      <h4>£{totalPrice.toFixed(2)}</h4>
                    </div>
                    <div className="orderInfoItem">
                      <p>Payment Method</p>
                      <h4>{selectedPayment}</h4>
                    </div>
                  </div>
                  <div className="orderTotalContainer">
                    <h3>Order Details</h3>
                    <div className="orderItems">
                      <table>
                        <thead>
                          <tr>
                            <th>PRODUCTS</th>
                            <th>SUBTOTALS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartItems.map((items) => (
                            <tr key={items.productID}>
                              <td>
                                {items.productName} x {items.quantity}
                              </td>
                              <td>£{(Number(items.productPrice) * Number(items.quantity)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="orderTotal">
                      <table>
                        <tbody>
                          <tr>
                            <th>Subtotal</th>
                            <td>£{totalPrice.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Shipping</th>
                            <td>£{(totalPrice === 0 ? 0 : SHIPPING_FEE).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>VAT</th>
                            <td>£{(totalPrice === 0 ? 0 : VAT_FEE).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Total</th>
                            <td>£{(totalPrice === 0 ? 0 : grandTotal).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* end tab3 */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
