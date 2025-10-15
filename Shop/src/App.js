// Frontend/src/App.js

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";

import Home from "./Pages/Home";
import About from "./Pages/About";
import Shop from "./Pages/Shop";
import Contact from "./Pages/Contact";
import Blog from "./Pages/Blog";
import Header from "./Components/Header/Navbar";
import Footer from "./Components/Footer/Footer";
import ProductDetails from "./Pages/ProductDetails";
import NotFound from "./Pages/NotFound";
import ScrollToTop from "./Components/ScrollButton/ScrollToTop";
import Authentication from "./Pages/Authentication";
import ResetPass from "./Components/Authentication/Reset/ResetPass";
import BlogDetails from "./Components/Blog/BlogDetails/BlogDetails";
import TermsConditions from "./Pages/TermsConditions";
import ShoppingCart from "./Components/ShoppingCart/ShoppingCart";
import Popup from "./Components/PopupBanner/Popup";
import { Toaster } from "react-hot-toast";
import AccountDetails from './Components/Dashboard/account-details'; 
import AccountOrders from './Components/Dashboard/account-orders'; 
import AccountDashboard from './Components/Dashboard/account-dashboard';
import AccountWishlist from './Components/Dashboard/account-wishlist';
import { AuthContextProvider } from "./Context/authContext";  // Import AuthContextProvider
import ProtectedRoute from "./Context/protectedRoute"; // Import ProtectedRoute
import AccountAddress from './Components/Dashboard/account-address';
import Logout from './Components/Authentication/LogOut/logout';



const App = () => {
  return (
    <AuthContextProvider> {/* Wrap the app with AuthContextProvider */}
      <Popup />
      <ScrollToTop />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/product" element={<ProductDetails />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/loginSignUp" element={<Authentication />} />
          <Route path="/resetPassword" element={<ResetPass />} />
          <Route path="/BlogDetails" element={<BlogDetails />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/cart" element={<ShoppingCart />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/logout" element={<Logout />} />


          {/* Protected routes */}
          <Route
            path="/account-dashboard"
            element={
              <ProtectedRoute>
                <AccountDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-details"
            element={
              <ProtectedRoute>

                <AccountDetails />
                </ProtectedRoute>
            }
          />
          <Route
            path="/account-orders"
            element={
              <ProtectedRoute>
                <AccountOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-address"
            element={
              <ProtectedRoute>
                <AccountAddress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-wishlist"
            element={
              <ProtectedRoute>
                <AccountWishlist />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
        <Toaster />
      </BrowserRouter>
    </AuthContextProvider>
  );
};

export default App;