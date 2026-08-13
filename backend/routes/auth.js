const express = require('express')
const router = express.Router()
const db = require('../config/db')

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { role } = req.body

  if (role === 'student') {
    const {
      full_name, email, password, phone,
      student_id, department, semester, gender,
      budget_min, budget_max, preferred_district, preferred_area
    } = req.body

    if (!email.endsWith('@g.bracu.ac.bd') && !email.endsWith('@bracu.ac.bd')) {
      return res.json({ success: false, message: 'Please use your BRACU university email.' })
    }

    const sql = `
      INSERT INTO users (role, full_name, email, password, phone, student_id, department, semester, gender, budget_min, budget_max, preferred_district, preferred_area)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    db.query(sql, [
      'student', full_name, email, password, phone,
      student_id, department, semester, gender,
      budget_min || null, budget_max || null,
      preferred_district, preferred_area
    ], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.json({ success: false, message: 'An account with this email already exists.' })
        }
        console.log('Signup error:', err)
        return res.json({ success: false, message: 'Something went wrong. Please try again.' })
      }
      const user = { id: result.insertId, role: 'student', full_name, email, is_verified: 0 }
      res.json({ success: true, message: 'Account created! Please verify your university email.', user })
    })

  } else if (role === 'landlord') {
    const { full_name, email, password, phone, nid, current_address, num_properties } = req.body

    const sql = `
      INSERT INTO users (role, full_name, email, password, phone, nid, current_address, num_properties)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    db.query(sql, [
      'landlord', full_name, email, password, phone,
      nid, current_address, num_properties || 0
    ], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.json({ success: false, message: 'An account with this email already exists.' })
        }
        console.log('Signup error:', err)
        return res.json({ success: false, message: 'Something went wrong. Please try again.' })
      }
      const user = { id: result.insertId, role: 'landlord', full_name, email, has_badge: 0 }
      res.json({ success: true, message: 'Account created! You can now post listings.', user })
    })

  } else {
    res.json({ success: false, message: 'Invalid role.' })
  }
})

// POST /api/auth/signin
router.post('/signin', (req, res) => {
  const { email, password, role } = req.body

  db.query(
    'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?',
    [email, password, role],
    (err, rows) => {
      if (err) {
        console.log('Signin error:', err)
        return res.json({ success: false, message: 'Something went wrong.' })
      }
      if (rows.length === 0) {
        return res.json({ success: false, message: 'Incorrect email, password, or role.' })
      }
      const user = rows[0]
      delete user.password
      res.json({ success: true, user })
    }
  )
})

// GET /api/auth/me?id=xxx
router.get('/me', (req, res) => {
  const { id } = req.query
  if (!id) return res.json({ success: false, message: 'id required' })

  db.query('SELECT * FROM users WHERE id = ?', [id], (err, rows) => {
    if (err || rows.length === 0) return res.json({ success: false, message: 'User not found' })
    const user = rows[0]
    delete user.password
    res.json({ success: true, user })
  })
})

module.exports = router
