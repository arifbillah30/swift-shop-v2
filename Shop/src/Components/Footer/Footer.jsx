// Frontend/src/Components/Footer/Footer.jsx

import React from "react";
import "./Footer.css";
import logo from "../../Assets/logo.png";
import paymentIcon from "../../Assets/paymentIcon.png";
import { FaFacebookF } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { FaPinterest } from "react-icons/fa";
import { Link } from "react-router-dom";

const Footer = () => {
  const handleSubscribe = (e) => {
    e.preventDefault();
    alert("Subscribed Successfully");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Placeholder actions for social icons without live profiles
  const comingSoon = (name) => () => alert(`${name} profile coming soon`);

  return (
    <>
      <footer className="footer">
        <div className="footer__container">
          <div className="footer_left">
            <div className="footer_logo_container">
              <img src={logo} alt="Swift Shop LTD" />
            </div>

            <p>
              82a James Carter Road, Mildenhall, Bury St. Edmunds, Suffolk,
              England, IP28 7DE United Kingdom
            </p>

            <div className="footer_address">
              <strong> contact@swiftshopltd.co.uk </strong>
              <strong> +447915605557 </strong>
            </div>

            <div className="social_links">
              {/* Valid external link */}
              <a
                href="https://www.facebook.com/swiftshopbd"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>

              {/* Buttons for non-navigational actions (no invalid href) */}
              <button
                type="button"
                onClick={comingSoon("X (Twitter)")}
                className="icon-button"
                aria-label="X (Twitter)"
              >
                <FaXTwitter />
              </button>
              <button
                type="button"
                onClick={comingSoon("Instagram")}
                className="icon-button"
                aria-label="Instagram"
              >
                <FaInstagram />
              </button>
              <button
                type="button"
                onClick={comingSoon("YouTube")}
                className="icon-button"
                aria-label="YouTube"
              >
                <FaYoutube />
              </button>
              <button
                type="button"
                onClick={comingSoon("Pinterest")}
                className="icon-button"
                aria-label="Pinterest"
              >
                <FaPinterest />
              </button>
            </div>
          </div>

          <div className="footer_content">
            <h5>Company</h5>
            <div className="links_container">
              <ul onClick={scrollToTop}>
                <li>
                  <Link to="/about">About Us</Link>
                </li>
                <li>
                  <Link to="/about">Career</Link>
                </li>
                <li>
                  <Link to="*">Affilates</Link>
                </li>
                <li>
                  <Link to="/blog">Blog</Link>
                </li>
                <li>
                  <Link to="/contact">Contact Us</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer_content">
            <h5>Shop</h5>
            <div className="links_container">
              <ul onClick={scrollToTop}>
                <li>
                  <Link to="/shop">New Arrivals</Link>
                </li>
                <li>
                  <Link to="/shop">Accessories</Link>
                </li>
                <li>
                  <Link to="/shop">Men</Link>
                </li>
                <li>
                  <Link to="/shop">Women</Link>
                </li>
                <li>
                  <Link to="/shop">Shop All</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer_content">
            <h5>Help</h5>
            <div className="links_container">
              <ul onClick={scrollToTop}>
                <li>
                  <Link to="/contact">Customer Service</Link>
                </li>
                <li>
                  <Link to="/loginSignUp">My Account</Link>
                </li>
                <li>
                  <Link to="/contact">Find a Store</Link>
                </li>
                <li>
                  <Link to="/terms">Legal & Privacy</Link>
                </li>
                <li>
                  <Link to="/contact">Contact</Link>
                </li>
                <li>
                  <Link to="/">Gift Card</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer_right">
            <h5>Subscribe</h5>
            <p>
              Be the first to get the latest news about trends, promotions, and
              much more!
            </p>

            <form onSubmit={handleSubscribe}>
              <input type="email" placeholder="Your email address" required />
              <button type="submit">Join</button>
            </form>

            <h6>Secure Payments</h6>
            <div className="paymentIconContainer">
              <img src={paymentIcon} alt="Supported payment methods" />
            </div>
          </div>
        </div>

        <div className="footer_bottom">
          <p>© 2025 Swift Shop LTD</p>
          <div className="footerLangCurrency">
            <div className="footerLang">
              <p>Language</p>
              <select name="language" id="language" defaultValue="English">
                <option value="English">English</option>
                <option value="Bangla">Bangla</option>
                <option value="Germany">Germany</option>
                <option value="French">French</option>
              </select>
            </div>
            <div className="footerCurrency">
              <p>Currency</p>
              <select name="currency" id="currency" defaultValue="BDT">
                <option value="BDT">৳ BDT</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>
        </div>
      </footer>

      {/* Optional: style buttons to look like links/icons */}
      <style>{`
        .icon-button {
          background: none;
          border: none;
          padding: 0;
          margin: 0 8px 0 0;
          cursor: pointer;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: inherit;
        }
        .icon-button:focus {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
        .social_links a, .social_links .icon-button {
          font-size: 18px;
        }
      `}</style>
    </>
  );
};

export default Footer;
