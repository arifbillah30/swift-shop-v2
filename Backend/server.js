// Backend/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// Routes
const authRoutes = require('./routes/authRoutes');       // <-- NEW
const productRoutes = require('./routes/productRoutes');
const orderControl = require('./routes/orderControl');
const addressRoutes = require('./routes/addressRoutes.js');
const blogRoutes = require('./routes/blogRoutes');

// DB (keep if other modules rely on pool at load time)
const db = require('./routes/dbconnect');

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// --------- Auth (moved out of server.js) ----------
app.use('/auth', authRoutes); // POST /auth/register, /auth/login; PUT /auth/update-account, /auth/update-password

// --------- Orders (legacy shape; keep for now) ----------
/*
  NOTE: These endpoints still write to your legacy `orders` table (denormalized).
  When you’re ready to switch to the normalized schema (orders + order_items + order_addresses),
  we’ll update these. For now, leaving exactly as they were so your frontend keeps working.
*/

// Create orders
app.post('/orders', async (req, res) => {
  const { orders, paymentMethod, userEmail } = req.body;

  if (!orders || !paymentMethod || !userEmail) {
    return res.status(400).json({ message: 'Missing orders, payment method, or user email.' });
  }

  const insertOrderQuery = `
    INSERT INTO orders (productID, frontImg, backImg, productName, productPrice, productReviews, quantity, paymentMethod, userEmail, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const dbPromises = orders.map(order => {
    const { productID, frontImg, backImg, productName, productPrice, productReviews, quantity } = order;
    const status = order.status || 'Pending';
    return db.query(insertOrderQuery, [
      productID, frontImg, backImg, productName, productPrice, productReviews, quantity, paymentMethod, userEmail, status
    ]);
  });

  try {
    await Promise.all(dbPromises);
    res.status(201).json({ message: 'Orders saved successfully.' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Get orders (grouped)
app.get('/orders', async (req, res) => {
  const { userEmail } = req.query;

  const query = userEmail
    ? 'SELECT * FROM orders WHERE userEmail = ? ORDER BY createdDate DESC'
    : 'SELECT * FROM orders ORDER BY createdDate DESC';

  try {
    const [results] = userEmail ? await db.query(query, [userEmail]) : await db.query(query);

    const grouped = {};
    results.forEach(order => {
      const key = `${order.createdDate}_${order.userEmail}`;
      if (!grouped[key]) {
        grouped[key] = {
          createdDate: order.createdDate,
          userEmail: order.userEmail,
          totalItem: 0,
          totalPrice: 0,
          orders: []
        };
      }
      grouped[key].totalItem += order.quantity;
      grouped[key].totalPrice += parseFloat(order.productPrice) * order.quantity;
      grouped[key].orders.push(order);
    });

    res.json({ orders: Object.values(grouped) });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Simple list for admin
app.get('/view-orders', (req, res) => {
  const query = 'SELECT * FROM orders';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error.' });
    }
    res.json(results);
  });
});

// Admin panel routes
app.use(productRoutes);
app.use(orderControl);

// Static files
app.use('/files/images', express.static(path.join(__dirname, 'files', 'images')));
app.use('/addresses', addressRoutes);

// Blog
app.use('/blogs', blogRoutes);
app.use('/files/blogs', express.static(path.join(__dirname, 'files', 'blogs')));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
