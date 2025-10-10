// src/lib/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '1234',
  database: process.env.DB_NAME || 'swiftshop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',   // Store timestamps in UTC
  charset: 'utf8mb4'
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL database.');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.stack);
  }
})();

module.exports = pool;