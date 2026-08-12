const express = require('express')
const router = express.Router()
const db = require('../config/db')
const multer = require('multer')
const path = require('path')

// multer v2 disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: (req, file, cb) => {
    const name = Date.now() + path.extname(file.originalname)
    cb(null, name)
  }
})

// fileFilter for multer v2 - uses mimeType not mimetype
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const mime = file.mimeType || file.mimetype
  if (allowed.includes(mime)) {
    cb(null, true)
  } else {
    console.log('Rejected file with mime:', mime)
    cb(null, false) // just skip non-image files silently
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
})

// POST /api/listings
router.post('/', upload.array('photos', 5), (req, res) => {
  const {
    title, description, rent, location, area,
    beds, furnished, gender_preference,
    utilities_included, lease_duration,
    available_from, landlord_name, landlord_phone
  } = req.body

  if (!title || !rent || !location) {
    return res.json({ success: false, message: 'Title, rent and location are required' })
  }

  // get uploaded photo filenames (req.files may be undefined in multer v2 if no files)
  const photos = req.files && req.files.length > 0
    ? req.files.map(f => f.filename).join(',')
    : ''

  const sql = `
    INSERT INTO listings 
    (title, description, rent, location, area, beds, furnished, gender_preference,
     utilities_included, lease_duration, available_from, photos, landlord_name, landlord_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const values = [
    title,
    description || '',
    parseInt(rent),
    location,
    area || '',
    parseInt(beds) || 1,
    furnished === 'true' ? 1 : 0,
    gender_preference || 'any',
    utilities_included === 'true' ? 1 : 0,
    lease_duration || '',
    available_from || null,
    photos,
    landlord_name || '',
    landlord_phone || ''
  ]

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log('Error inserting listing:', err)
      return res.json({ success: false, message: 'Failed to save listing' })
    }
    res.json({ success: true, message: 'Listing posted!', id: result.insertId })
  })
})

// GET /api/listings
router.get('/', (req, res) => {
  const { available_before, available_after } = req.query

  let sql = 'SELECT * FROM listings WHERE status = "active"'
  const params = []

  if (available_before) {
    sql += ' AND (available_from <= ? OR available_from IS NULL)'
    params.push(available_before)
  }

  if (available_after) {
    sql += ' AND (available_from >= ? OR available_from IS NULL)'
    params.push(available_after)
  }

  sql += ' ORDER BY created_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.log('Error fetching listings:', err)
      return res.json({ success: false, message: 'Failed to fetch listings' })
    }
    res.json({ success: true, data: results })
  })
})

// GET /api/listings/:id
router.get('/:id', (req, res) => {
  db.query('SELECT * FROM listings WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      console.log(err)
      return res.json({ success: false, message: 'Error' })
    }
    if (results.length === 0) {
      return res.json({ success: false, message: 'Listing not found' })
    }
    res.json({ success: true, data: results[0] })
  })
})

module.exports = router
