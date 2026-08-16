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
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', // photos & floor plans
    'video/mp4', 'video/webm', 'video/quicktime' // video tours
  ]
  const mime = file.mimeType || file.mimetype
  if (allowed.includes(mime)) {
    cb(null, true)
  } else {
    console.log('Rejected file with mime:', mime)
    cb(null, false) // just skip non-allowed files silently
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter
})

// POST /api/listings
router.post('/', upload.fields([{ name: 'photos', maxCount: 5 }, { name: 'video', maxCount: 1 }, { name: 'floor_plan', maxCount: 1 }]), (req, res) => {
  const {
    title, description, rent, location, area, district,
    beds, furnished, gender_preference,
    utilities_included, lease_duration,
    available_from, landlord_name, landlord_phone, walkthrough_link,
    property_type, distance_to_campus, advance_deposit, curfew_time,
    guests_allowed, smoking_allowed,
    has_wifi, has_generator, has_cctv, has_lift, has_fridge,
    landlord_id, property_group
  } = req.body

  if (!title || !rent || !location) {
    return res.json({ success: false, message: 'Title, rent and location are required' })
  }

  // get uploaded photo filenames
  const photosArray = req.files && req.files['photos'] ? req.files['photos'] : []
  const photos = photosArray.map(f => f.filename).join(',')

  // get video filename
  const video = req.files && req.files['video'] && req.files['video'].length > 0
    ? req.files['video'][0].filename
    : null

  // get floor plan filename
  const floor_plan = req.files && req.files['floor_plan'] && req.files['floor_plan'].length > 0
    ? req.files['floor_plan'][0].filename
    : null

  const sql = `
    INSERT INTO listings 
    (title, description, rent, location, area, district, beds, furnished, gender_preference,
     utilities_included, lease_duration, available_from, photos, video, floor_plan, walkthrough_link,
     property_type, distance_to_campus, advance_deposit, curfew_time,
     guests_allowed, smoking_allowed, has_wifi, has_generator, has_cctv, has_lift, has_fridge,
     landlord_name, landlord_phone, landlord_id, property_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const values = [
    title,
    description || '',
    parseInt(rent),
    location,
    area || '',
    district || '',
    parseInt(beds) || 1,
    furnished === 'true' ? 1 : 0,
    gender_preference || 'any',
    utilities_included === 'true' ? 1 : 0,
    lease_duration || '',
    available_from || null,
    photos,
    video,
    floor_plan,
    walkthrough_link || null,
    property_type || 'entire_flat',
    distance_to_campus ? parseFloat(distance_to_campus) : null,
    advance_deposit || '',
    curfew_time || '',
    guests_allowed === 'false' ? 0 : 1,
    smoking_allowed === 'true' ? 1 : 0,
    has_wifi === 'true' ? 1 : 0,
    has_generator === 'true' ? 1 : 0,
    has_cctv === 'true' ? 1 : 0,
    has_lift === 'true' ? 1 : 0,
    has_fridge === 'true' ? 1 : 0,
    landlord_name || '',
    landlord_phone || '',
    landlord_id || null,
    property_group || null
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
  const {
    available_before, available_after, search,
    min_rent, max_rent, max_distance,
    furnished, utilities_included, gender_preference, lease_duration
  } = req.query

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

  // search box - matches title, location, area or district
  if (search) {
    sql += ' AND (title LIKE ? OR location LIKE ? OR area LIKE ? OR district LIKE ?)'
    const term = `%${search}%`
    params.push(term, term, term, term)
  }

  if (min_rent) {
    sql += ' AND rent >= ?'
    params.push(parseInt(min_rent))
  }

  if (max_rent) {
    sql += ' AND rent <= ?'
    params.push(parseInt(max_rent))
  }

  // distance to campus in km, listings with no distance set are kept too
  if (max_distance) {
    sql += ' AND (distance_to_campus <= ? OR distance_to_campus IS NULL)'
    params.push(parseFloat(max_distance))
  }

  if (furnished === 'true' || furnished === 'false') {
    sql += ' AND furnished = ?'
    params.push(furnished === 'true' ? 1 : 0)
  }

  if (utilities_included === 'true' || utilities_included === 'false') {
    sql += ' AND utilities_included = ?'
    params.push(utilities_included === 'true' ? 1 : 0)
  }

  if (gender_preference && gender_preference !== 'any') {
    sql += ' AND gender_preference = ?'
    params.push(gender_preference)
  }

  if (lease_duration) {
    sql += ' AND lease_duration = ?'
    params.push(lease_duration)
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