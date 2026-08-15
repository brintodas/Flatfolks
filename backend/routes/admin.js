const express = require('express')
const router = express.Router()
const db = require('../config/db')

// Simple admin auth middleware — checks if request has valid admin credentials
function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== 'flatfolks-admin-2024') {
    return res.json({ success: false, message: 'Unauthorized' })
  }
  next()
}

// GET /api/admin/users — all students and landlords
router.get('/users', requireAdmin, (req, res) => {
  db.query(
    `SELECT id, role, full_name, email, phone, is_verified, has_badge, created_at
     FROM users WHERE role IN ('student','landlord')
     ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, data: rows })
    }
  )
})

// PUT /api/admin/verify-user/:id — toggle verified badge for a user
router.put('/verify-user/:id', requireAdmin, (req, res) => {
  const { id } = req.params
  db.query('SELECT is_verified, has_badge FROM users WHERE id = ?', [id], (err, rows) => {
    if (err || rows.length === 0) return res.json({ success: false, message: 'User not found' })
    const newVerified = rows[0].is_verified ? 0 : 1
    db.query(
      'UPDATE users SET is_verified = ?, has_badge = ? WHERE id = ?',
      [newVerified, newVerified, id],
      (err2) => {
        if (err2) return res.json({ success: false, message: 'DB error' })
        res.json({ success: true, is_verified: newVerified })
      }
    )
  })
})

// GET /api/admin/listings — all listings with owner info
router.get('/listings', requireAdmin, (req, res) => {
  db.query(
    `SELECT id, title, location, rent, status, is_verified, landlord_name, landlord_phone, created_at
     FROM listings ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, data: rows })
    }
  )
})

// PUT /api/admin/verify-listing/:id — toggle verified badge for a listing
router.put('/verify-listing/:id', requireAdmin, (req, res) => {
  const { id } = req.params
  db.query('SELECT is_verified FROM listings WHERE id = ?', [id], (err, rows) => {
    if (err || rows.length === 0) return res.json({ success: false, message: 'Listing not found' })
    const newVerified = rows[0].is_verified ? 0 : 1
    db.query('UPDATE listings SET is_verified = ? WHERE id = ?', [newVerified, id], (err2) => {
      if (err2) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, is_verified: newVerified })
    })
  })
})

module.exports = router
