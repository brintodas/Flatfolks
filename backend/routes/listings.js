const express = require('express')
const router = express.Router()
const db = require('../config/db')
const multer = require('multer')
const path = require('path')
const attachGroupContext = require('../middleware/roommateContext')

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
// Accepts optional ?user_id= to attach group context (budget/bed aggregates)
router.get('/', attachGroupContext, (req, res) => {
  const {
    available_before, available_after, search,
    min_rent, max_rent, max_distance,
    furnished, utilities_included, gender_preference, lease_duration
  } = req.query

  let sql = 'SELECT * FROM listings WHERE status = "active"'
  const params = []

  // If in Group Mode and a group context exists, auto-apply aggregate budget and bed filters
  // (only when no explicit filter was passed by the user)
  const isGroupMode = req.query.search_mode !== 'single' && Boolean(req.groupContext)
  const effectiveMaxRent  = max_rent  || (isGroupMode ? req.groupContext.maxBudget  : null)
  const effectiveMinBeds  = isGroupMode && !req.query.beds ? req.groupContext.minBeds : null

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

  if (effectiveMaxRent) {
    sql += ' AND rent <= ?'
    params.push(parseInt(effectiveMaxRent))
  }

  // distance to campus in km, listings with no distance set are kept too
  if (max_distance) {
    sql += ' AND (distance_to_campus <= ? OR distance_to_campus IS NULL)'
    params.push(parseFloat(max_distance))
  }

  // Auto-filter by minimum beds needed for the whole group
  if (effectiveMinBeds) {
    sql += ' AND beds >= ?'
    params.push(effectiveMinBeds)
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
    // Surface group context metadata so frontend can show a hint like
    // "Showing flats for your 3-person group (budget ৳45,000 combined)"
    res.json({ success: true, data: results, groupContext: req.groupContext || null })
  })
})

// GET /api/listings/featured
router.get('/featured', (req, res) => {
  const { area } = req.query
  
  const handleResponse = (err, results) => {
    if (err) {
      console.log('Error fetching featured listings:', err)
      return res.json({ success: false, message: 'Failed to fetch featured listings' })
    }
    res.json({ success: true, data: results })
  }

  if (area) {
    db.query('SELECT * FROM listings WHERE status = "active" AND (area = ? OR district = ?) ORDER BY RAND() LIMIT 4', [area, area], (err, results) => {
      if (err) return handleResponse(err, results)
      
      if (results.length === 0) {
        db.query('SELECT * FROM listings WHERE status = "active" ORDER BY RAND() LIMIT 4', handleResponse)
      } else {
        handleResponse(null, results)
      }
    })
  } else {
    db.query('SELECT * FROM listings WHERE status = "active" ORDER BY RAND() LIMIT 4', handleResponse)
  }
})

// GET /api/listings/compare?ids=3,7
// Fetches multiple listings in one round trip for the comparison page.
// Frontend can also just hit GET /:id twice, but this saves a request.
router.get('/compare', (req, res) => {
  const idsParam = req.query.ids || ''
  const ids = idsParam.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))

  if (ids.length === 0) {
    return res.json({ success: false, message: 'Provide at least one id, e.g. ?ids=3,7' })
  }

  const placeholders = ids.map(() => '?').join(',')
  db.query(`SELECT * FROM listings WHERE id IN (${placeholders})`, ids, (err, results) => {
    if (err) {
      console.log('Error fetching listings for compare:', err)
      return res.json({ success: false, message: 'Failed to fetch listings' })
    }
    res.json({ success: true, data: results })
  })
})

// GET /api/listings/applications/student/:id
router.get('/applications/student/:id', (req, res) => {
  const studentId = req.params.id

  db.query(
    `SELECT v.*, l.title AS listing_title, l.location AS listing_location, l.rent, l.photos, l.landlord_id
     FROM viewing_requests v
     JOIN listings l ON l.id = v.listing_id
     WHERE v.student_id = ?
     ORDER BY v.created_at DESC`,
    [studentId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server error.' })
      res.json({ success: true, applications: rows })
    }
  )
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

// ─── POST /api/listings/:id/apply ───────────────────────────────────────────
// Student submits a comprehensive application for a listing
router.post('/:id/apply', upload.single('id_document'), (req, res) => {
  const listing_id = req.params.id
  const { 
    student_id, move_in_date, notes, 
    guarantor_name, guarantor_phone, guarantor_relation, 
    rent_payer, expected_duration, 
    emergency_contact_name, emergency_contact_phone, 
    agreed_to_rules 
  } = req.body

  const id_document = req.file ? req.file.filename : null

  if (!student_id) {
    return res.status(400).json({ success: false, message: 'student_id is required.' })
  }

  // First fetch the listing to get landlord_id
  db.query(
    `SELECT landlord_id, status FROM listings WHERE id = ?`,
    [listing_id],
    (err, listings) => {
      if (err) return res.status(500).json({ success: false, message: 'Server error.' })
      if (!listings.length) return res.status(404).json({ success: false, message: 'Listing not found.' })

      const listing = listings[0]
      if (listing.status === 'inactive') {
        return res.status(400).json({ success: false, message: 'This listing is no longer available.' })
      }
      if (!listing.landlord_id) {
        return res.status(400).json({ success: false, message: 'This listing has no landlord assigned yet.' })
      }

      db.query(
        `INSERT INTO viewing_requests (
          listing_id, student_id, landlord_id, move_in_date, notes, status,
          guarantor_name, guarantor_phone, guarantor_relation, rent_payer,
          expected_duration, emergency_contact_name, emergency_contact_phone, 
          agreed_to_rules, id_document
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          listing_id, student_id, listing.landlord_id, move_in_date || null, notes || null,
          guarantor_name || null, guarantor_phone || null, guarantor_relation || null, rent_payer || null,
          expected_duration || null, emergency_contact_name || null, emergency_contact_phone || null,
          agreed_to_rules === 'true' || agreed_to_rules === '1' ? 1 : 0, id_document
        ],
        (err2) => {
          if (err2) {
            if (err2.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ success: false, message: 'You have already applied for this listing.' })
            }
            return res.status(500).json({ success: false, message: 'Server error.' })
          }
          res.json({ success: true, message: 'Application submitted! The landlord will review it shortly.' })
        }
      )
    }
  )
})

// ─── GET /api/listings/:id/my-application?user_id=X ─────────────────────────
// Lets the frontend check if a student has already applied + current status
router.get('/:id/my-application', (req, res) => {
  const { user_id } = req.query
  const listing_id = req.params.id
  if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required.' })

  db.query(
    `SELECT id, status, move_in_date, notes, created_at, decline_reason FROM viewing_requests
     WHERE listing_id = ? AND student_id = ? LIMIT 1`,
    [listing_id, user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server error.' })
      if (!rows.length) return res.json({ success: true, application: null })
      res.json({ success: true, application: rows[0] })
    }
  )
})

module.exports = router