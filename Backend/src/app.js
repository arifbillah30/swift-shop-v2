// swift-shop-v2/Backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { AppError } = require('./lib/errors');
const { fail } = require('./lib/http');

// Import routes
const shopProductsRoutes = require('./routes/shop/products.routes');
const shopAuthRoutes = require('./routes/shop/auth.routes');
const shopBlogsRoutes = require('./routes/shop/blogs.routes');
const shopOrdersRoutes = require('./routes/shop/orders.routes');
const shopCartRoutes = require('./routes/shop/cart.routes');
const shopWishlistRoutes = require('./routes/shop/wishlist.routes');
// const shopDashboardRoutes = require('./routes/shop/dashboard.routes');

const adminProductsRoutes = require('./routes/admin/products.routes');
const adminAuthRoutes = require('./routes/admin/auth.routes');
const adminBrandsRoutes = require('./routes/admin/brands.routes');
const adminCategoriesRoutes = require('./routes/admin/categories.routes');
const adminOrdersRoutes = require('./routes/admin/orders.routes');
const adminCustomersRoutes = require('./routes/admin/customers.routes');

// Import new MVC routes
const addressRoutes = require('./routes/addresses.routes');
const orderRoutes = require('./routes/orders.routes');
const settingRoutes = require('./routes/settings.routes');
const customerRoutes = require('./routes/customer.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/files', express.static(path.join(__dirname, '..', 'files')));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Swift Shop Backend API v2.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes v1
const apiV1 = express.Router();

// Shop routes (public)
apiV1.use('/products', shopProductsRoutes);
apiV1.use('/auth', shopAuthRoutes);
apiV1.use('/blogs', shopBlogsRoutes);
apiV1.use('/orders', shopOrdersRoutes);
apiV1.use('/cart', shopCartRoutes);
apiV1.use('/wishlist', shopWishlistRoutes);
// apiV1.use('/user/dashboard', shopDashboardRoutes);

// Admin routes
apiV1.use('/admin/products', adminProductsRoutes);
apiV1.use('/admin/auth', adminAuthRoutes);
apiV1.use('/admin/brands', adminBrandsRoutes);
apiV1.use('/admin/categories', adminCategoriesRoutes);
apiV1.use('/admin/orders', adminOrdersRoutes);
apiV1.use('/admin/customers', adminCustomersRoutes);

// Additional routes
apiV1.use('/addresses', addressRoutes);
apiV1.use('/orders', orderRoutes);
apiV1.use('/settings', settingRoutes);

// Mount API v1
app.use('/api/v1', apiV1);

// Legacy routes (maintain backward compatibility)
app.use('/auth', shopAuthRoutes); // Legacy auth routes
app.use('/admin', adminAuthRoutes); // Legacy admin routes  
app.use('/addresses', addressRoutes); // Legacy address routes (now MVC)
app.use('/customer', customerRoutes); // Legacy customer routes
app.use('/', orderRoutes); // Legacy order routes (now MVC)
app.use('/setting', settingRoutes); // Legacy setting routes (now MVC)

// Additional static file routes
app.use('/files/images', express.static(path.join(__dirname, '..', 'files', 'images')));
app.use('/files/products', express.static(path.join(__dirname, '..', 'files', 'products')));
app.use('/files/blogs', express.static(path.join(__dirname, '..', 'files', 'blogs')));

// 404 handler
app.use('*', (req, res) => {
  return fail(res, 404, `Route ${req.originalUrl} not found`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);

  // Handle known application errors
  if (err instanceof AppError) {
    return fail(res, err.statusCode, err.message, err.errors);
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return fail(res, 400, 'Validation failed', err.details);
  }

  // Handle database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return fail(res, 409, 'Duplicate entry');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return fail(res, 401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return fail(res, 401, 'Token expired');
  }

  // Default error
  return fail(res, 500, 'Internal server error');
});

module.exports = app;