// swift-shop-v2/Backend/routes/addressRoutes.js

const express = require('express');
const router = express.Router();
const db = require('./dbconnect');
const Joi = require('joi');

// -------- helpers --------
const normalizeEmail = (email) => (email || '').trim().toLowerCase();

async function getUserIdByEmail(email) {
  const [rows] = await db.query('SELECT id FROM users WHERE email=? LIMIT 1', [normalizeEmail(email)]);
  return rows[0]?.id || null;
}

// payload matches SQL columns in `addresses`
const addressSchema = Joi.object({
  line1: Joi.string().max(191).required(),
  line2: Joi.string().allow('', null).max(191),
  city: Joi.string().max(120).required(),
  state: Joi.string().allow('', null).max(120),
  postal_code: Joi.string().allow('', null).max(40),
  country_code: Joi.string().length(2).uppercase().default('BD'),
  is_default: Joi.boolean().default(false),
  // for POST only (when not using :type in URL)
  address_type: Joi.string().valid('billing', 'shipping', 'other'),
});

const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
};

// ===== GET all addresses for a user (by email) =====
router.get('/:email', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.params.email);
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const userId = await getUserIdByEmail(email);
    if (!userId) return res.status(404).json({ success: false, message: 'User not found' });

    const [rows] = await db.query(
      `SELECT id, user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default, created_at
       FROM addresses
       WHERE user_id=?
       ORDER BY (address_type='shipping') DESC, is_default DESC, id DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// ===== GET single address by type =====
router.get('/:email/:type', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.params.email);
    const type = (req.params.type || '').toLowerCase();
    if (!['billing', 'shipping', 'other'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid address type' });
    }

    const userId = await getUserIdByEmail(email);
    if (!userId) return res.status(404).json({ success: false, message: 'User not found' });

    const [rows] = await db.query(
      `SELECT id, user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default, created_at
       FROM addresses
       WHERE user_id=? AND address_type=?
       LIMIT 1`,
      [userId, type]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Address not found' });

    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
});

// ===== PUT upsert address by type (URL carries the type) =====
router.put('/:email/:type', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.params.email);
    const type = (req.params.type || '').toLowerCase();
    if (!['billing', 'shipping', 'other'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid address type' });
    }

    const userId = await getUserIdByEmail(email);
    if (!userId) return res.status(404).json({ success: false, message: 'User not found' });

    // validate body (type comes from URL, forbid it here)
    const { value, error } = addressSchema.fork(['address_type'], (s) => s.forbidden())
      .validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const payload = {
      line1: value.line1,
      line2: value.line2 ?? null,
      city: value.city,
      state: value.state ?? null,
      postal_code: value.postal_code ?? null,
      country_code: (value.country_code || 'BD').toUpperCase(),
      is_default: !!value.is_default,
    };

    // does one exist already?
    const [exists] = await db.query(
      'SELECT id FROM addresses WHERE user_id=? AND address_type=? LIMIT 1',
      [userId, type]
    );

    if (exists.length) {
      await db.query(
        `UPDATE addresses
         SET line1=?, line2=?, city=?, state=?, postal_code=?, country_code=?, is_default=?
         WHERE user_id=? AND address_type=?`,
        [payload.line1, payload.line2, payload.city, payload.state, payload.postal_code,
         payload.country_code, payload.is_default, userId, type]
      );
    } else {
      await db.query(
        `INSERT INTO addresses (user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, type, payload.line1, payload.line2, payload.city, payload.state,
         payload.postal_code, payload.country_code, payload.is_default]
      );
    }

    const [row] = await db.query(
      `SELECT id, user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default, created_at
       FROM addresses
       WHERE user_id=? AND address_type=?
       LIMIT 1`,
      [userId, type]
    );
    res.json({ success: true, message: exists.length ? 'Address updated successfully' : 'Address created successfully', address: row[0] });
  } catch (e) { next(e); }
});

// ===== POST create address (type in body) =====
router.post('/', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.userEmail);
    const type = (req.body.address_type || '').toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'userEmail is required' });
    if (!['billing', 'shipping', 'other'].includes(type)) {
      return res.status(400).json({ success: false, message: 'address_type must be billing, shipping, or other' });
    }

    const { value, error } = addressSchema.validate({ ...req.body, address_type: type }, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const userId = await getUserIdByEmail(email);
    if (!userId) return res.status(404).json({ success: false, message: 'User not found' });

    await db.query(
      `INSERT INTO addresses (user_id, address_type, line1, line2, city, state, postal_code, country_code, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, value.line1, value.line2 ?? null, value.city, value.state ?? null,
       value.postal_code ?? null, (value.country_code || 'BD').toUpperCase(), !!value.is_default]
    );

    res.status(201).json({ success: true, message: 'Address added successfully' });
  } catch (e) { next(e); }
});

router.use(errorHandler);
module.exports = router;
