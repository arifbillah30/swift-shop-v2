-- Recommended DB settings
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop in dependency order (safe re-run)
DROP TABLE IF EXISTS order_coupons, payments, shipments, order_addresses, order_items, orders,
  cart_items, carts, wishlist_items, wishlists, reviews, inventory, product_images, product_variants,
  products, categories, brands, addresses, users, roles, coupons;

SET FOREIGN_KEY_CHECKS = 1;

-- ===== Identities & Access =====
CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(80),
  last_name VARCHAR(80),
  display_name VARCHAR(120),
  phone VARCHAR(40),
  role_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE addresses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('shipping','billing','other') NOT NULL DEFAULT 'shipping',
  line1 VARCHAR(191) NOT NULL,
  line2 VARCHAR(191),
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120),
  postal_code VARCHAR(40),
  country_code CHAR(2) NOT NULL DEFAULT 'BD',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id, address_type, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Catalog =====
CREATE TABLE brands (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  parent_id INT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  brand_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  sku VARCHAR(64) UNIQUE,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description MEDIUMTEXT,
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX (category_id, status),
  FULLTEXT KEY ft_products_description (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_images (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  url VARCHAR(255) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_pimages_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX (product_id, is_primary, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Product variants (color/size/material/price per sellable unit)
CREATE TABLE product_variants (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(64) UNIQUE,
  color VARCHAR(80),
  size VARCHAR(80),
  material VARCHAR(120),
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  weight_g INT UNSIGNED,
  length_cm DECIMAL(8,2),
  width_cm DECIMAL(8,2),
  height_cm DECIMAL(8,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_pvars_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX (product_id, is_active),
  INDEX (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory (
  variant_id BIGINT UNSIGNED PRIMARY KEY,
  qty_on_hand INT NOT NULL DEFAULT 0,
  qty_reserved INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_inventory_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Shopping session =====
CREATE TABLE carts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  status ENUM('active','converted','abandoned') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cart_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price_snapshot DECIMAL(10,2) NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_citems_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_citems_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  UNIQUE KEY uq_cart_variant (cart_id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Orders =====
CREATE TABLE orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid','paid','refunded','partial_refund') NOT NULL DEFAULT 'unpaid',
  fulfillment_status ENUM('unfulfilled','partial','fulfilled') NOT NULL DEFAULT 'unfulfilled',
  payment_method VARCHAR(50),                  -- e.g., 'Cash on delivery', 'SSLCOMMERZ', 'Stripe'
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  placed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id, status),
  INDEX (placed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  product_name_snapshot VARCHAR(191) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(12,2) AS (unit_price * quantity) STORED,
  front_img_snapshot VARCHAR(255),
  back_img_snapshot VARCHAR(255),
  reviews_text_snapshot VARCHAR(255), -- optional snapshot of “2k+ reviews”
  CONSTRAINT fk_oitems_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oitems_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_oitems_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  INDEX (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shipping / Billing addresses as captured at order time (immutable snapshots)
CREATE TABLE order_addresses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('shipping','billing') NOT NULL,
  full_name VARCHAR(160),
  phone VARCHAR(40),
  line1 VARCHAR(191) NOT NULL,
  line2 VARCHAR(191),
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120),
  postal_code VARCHAR(40),
  country_code CHAR(2) NOT NULL DEFAULT 'BD',
  CONSTRAINT fk_oaddr_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY uq_order_addr (order_id, address_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(80),           -- e.g., SSLCommerz, Stripe
  method VARCHAR(50),             -- e.g., card, COD
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  status ENUM('pending','authorized','captured','failed','refunded') NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(120),
  paid_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE shipments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  carrier VARCHAR(80),            -- e.g., BD Express, Sundarban
  tracking_number VARCHAR(120),
  status ENUM('pending','shipped','in_transit','delivered','returned','cancelled') NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ship_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Engagement =====
CREATE TABLE reviews (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(150),
  body TEXT,
  status ENUM('pending','published','rejected') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_review_once (user_id, product_id),
  INDEX (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wishlists (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT 'Default',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wish_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_default (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wishlist_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_witem_wish FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
  CONSTRAINT fk_witem_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_witem_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    UNIQUE KEY uq_wish_product (wishlist_id, product_id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Promotions =====
CREATE TABLE coupons (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT UNSIGNED,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  min_order_amount DECIMAL(12,2) DEFAULT 0.00,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_coupons (
  order_id BIGINT UNSIGNED NOT NULL,
  coupon_id BIGINT UNSIGNED NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (order_id, coupon_id),
  CONSTRAINT fk_oc_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oc_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Seeds =====
INSERT INTO roles (name) VALUES ('customer'), ('admin');
INSERT INTO users (email, password_hash, first_name, last_name, display_name, role_id)
VALUES ('admin@gmail.com', '$2y$10$dummyhashreplace', 'Admin', 'User', 'admin', 2); -- replace with real bcrypt

-- Helpful indexes for search/sort
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_created ON products(created_at);
