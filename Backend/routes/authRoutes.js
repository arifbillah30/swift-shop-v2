const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./dbconnect');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { displayName, email, password, firstName, lastName, phone } = req.body;
    if (!displayName || !email || !password) {
      return res.status(400).json({ message: 'displayName, email, password required' });
    }

    const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, display_name, phone, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, TRUE)`,
      [email, hash, firstName || null, lastName || null, displayName, phone || null]
    );

    res.status(201).json({ message: 'Registered', userId: result.insertId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email & password required' });

    const [rows] = await db.query(
      `SELECT id, email, password_hash, display_name, first_name, last_name, role_id, is_active
       FROM users WHERE email=? LIMIT 1`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });

    const u = rows[0];
    if (!u.is_active) return res.status(403).json({ message: 'Account is inactive' });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ uid: u.id, role: u.role_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        firstName: u.first_name,
        lastName: u.last_name,
        roleId: u.role_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= UPDATE ACCOUNT =================
router.put('/update-account', async (req, res) => {
  try {
    const { email, firstName, lastName, displayName, phone } = req.body;
    if (!email || !displayName) {
      return res.status(400).json({ message: 'email and displayName required' });
    }

    await db.query(
      `UPDATE users 
       SET first_name=?, last_name=?, display_name=?, phone=?, updated_at=NOW() 
       WHERE email=?`,
      [firstName || null, lastName || null, displayName, phone || null, email]
    );

    res.json({ message: 'Account updated successfully.' });
  } catch (err) {
    console.error('Update account error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= UPDATE PASSWORD =================
router.put('/update-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'email, currentPassword, newPassword required' });
    }

    const [[user]] = await db.query('SELECT id, password_hash FROM users WHERE email=?', [email]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Current password incorrect.' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?',
      [newHash, user.id]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
