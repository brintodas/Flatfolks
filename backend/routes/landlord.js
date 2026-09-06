const express = require('express')
const router = express.Router()
const db = require('../config/db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// wraps db.query in a promise so multi-step queries (like the public profile) can use async/await
function q(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
  })
}

// ---- multer setup for landlord verification documents ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/verification')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `doc_${Date.now()}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new Error('Only JPG, PNG, WEBP or PDF files are allowed'))
  }
})

// ---- multer setup for landlord profile pictures ----
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `avatar_${req.params.id}_${Date.now()}${ext}`)
  }
})
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new Error('Only JPG, PNG or WEBP images are allowed'))
  }
})

/* ================================================================== */
/* A. LANDLORD PROFILE & BUSINESS ACCOUNT                              */
/* ================================================================== */

// GET /api/landlord/:id/profile — the landlord's own account settings
router.get('/:id/profile', (req, res) => {
  db.query(
    `SELECT id, full_name, email, phone, nid, current_address, business_name,
            business_type, bio, profile_picture, num_properties, verification_doc, verification_status,
            is_verified, has_badge, created_at
     FROM users WHERE id = ? AND role = 'landlord'`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      if (rows.length === 0) return res.json({ success: false, message: 'Landlord not found' })
      res.json({ success: true, data: rows[0] })
    }
  )
})

// PUT /api/landlord/:id/profile — update business/contact info
router.put('/:id/profile', (req, res) => {
  const { business_name, business_type, bio, phone, current_address, nid, full_name } = req.body
  db.query(
    `UPDATE users SET business_name = ?, business_type = ?, bio = ?, phone = ?,
       current_address = ?, nid = ?, full_name = ?
     WHERE id = ? AND role = 'landlord'`,
    [business_name || null, business_type || 'individual', bio || null, phone || null,
     current_address || null, nid || null, full_name, req.params.id],
    (err) => {
      if (err) { console.log('Profile update error:', err); return res.json({ success: false, message: 'DB error' }) }
      res.json({ success: true, message: 'Profile updated' })
    }
  )
})

// POST /api/landlord/:id/verification-doc — upload ownership deed / NID, marks status "pending"
router.post('/:id/verification-doc', upload.single('document'), (req, res) => {
  if (!req.file) return res.json({ success: false, message: 'No file uploaded' })
  const docPath = `/uploads/verification/${req.file.filename}`
  db.query(
    `UPDATE users SET verification_doc = ?, verification_status = 'pending' WHERE id = ? AND role = 'landlord'`,
    [docPath, req.params.id],
    (err) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, message: 'Document submitted for admin review', verification_doc: docPath })
    }
  )
})

// POST /api/landlord/:id/profile-picture — upload/replace the avatar shown on the public profile
router.post('/:id/profile-picture', uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.json({ success: false, message: 'No image uploaded' })
  const picPath = `/uploads/avatars/${req.file.filename}`

  // fetch the old picture first so we can clean it up off disk after a successful swap
  db.query(`SELECT profile_picture FROM users WHERE id = ? AND role = 'landlord'`, [req.params.id], (selErr, rows) => {
    if (selErr) return res.json({ success: false, message: 'DB error' })
    if (rows.length === 0) return res.json({ success: false, message: 'Landlord not found' })
    const oldPic = rows[0].profile_picture

    db.query(
      `UPDATE users SET profile_picture = ? WHERE id = ? AND role = 'landlord'`,
      [picPath, req.params.id],
      (err) => {
        if (err) return res.json({ success: false, message: 'DB error' })
        if (oldPic) {
          const oldFile = path.join(__dirname, '..', oldPic)
          fs.unlink(oldFile, () => {}) // best-effort cleanup, ignore errors
        }
        res.json({ success: true, message: 'Profile picture updated', profile_picture: picPath })
      }
    )
  })
})

/* ================================================================== */
/* B. PUBLIC LANDLORD PROFILE                                          */
/* ================================================================== */

// GET /api/landlord/:id/public — everything a student sees on the public profile
router.get('/:id/public', async (req, res) => {
  const landlordId = req.params.id

  try {
    const userRows = await q(
      `SELECT id, full_name, business_name, business_type, bio, phone, profile_picture,
              is_verified, has_badge, verification_status, created_at
       FROM users WHERE id = ? AND role = 'landlord'`,
      [landlordId]
    )
    if (userRows.length === 0) return res.json({ success: false, message: 'Landlord not found' })
    const landlord = userRows[0]

    // active/open listings — drives the portfolio list, occupancy stats, service areas, and price range
    const listings = await q(
      `SELECT l.id, l.title, l.property_group, l.rent, l.location, l.area, l.district,
              l.beds, l.photos, l.status, l.property_type,
              (SELECT COUNT(*) FROM tenancies t WHERE t.listing_id = l.id AND t.status = 'active') AS occupied
       FROM listings l
       WHERE l.landlord_id = ? AND l.status != 'inactive'
       ORDER BY l.created_at DESC`,
      [landlordId]
    )

    const ratingRows = await q(
      `SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
       FROM landlord_reviews WHERE landlord_id = ?`,
      [landlordId]
    )

    const breakdownRows = await q(
      `SELECT rating, COUNT(*) AS count FROM landlord_reviews
       WHERE landlord_id = ? GROUP BY rating`,
      [landlordId]
    )

    // lifetime rental track record — every tenancy ever created for this landlord,
    // active or ended, across every listing they've owned (not just current ones)
    const trackRows = await q(
      `SELECT
         COUNT(*) AS total_tenancies,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_tenancies,
         COUNT(DISTINCT listing_id) AS units_ever_rented
       FROM tenancies WHERE landlord_id = ?`,
      [landlordId]
    )

    // every listing this landlord has ever posted, regardless of current status —
    // a much more honest measure of "how long have they actually been doing this"
    const totalListingsRows = await q(
      `SELECT COUNT(*) AS total FROM listings WHERE landlord_id = ?`,
      [landlordId]
    )

    // how reliably they respond to viewing requests — a real responsiveness signal,
    // not just a vanity metric
    const viewingRows = await q(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('approved','declined') THEN 1 ELSE 0 END) AS responded
       FROM viewing_requests WHERE landlord_id = ?`,
      [landlordId]
    )

    const totalUnits = listings.length
    const vacantUnits = listings.filter(l => l.occupied === 0).length
    const occupiedUnits = totalUnits - vacantUnits
    const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0

    const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
      const row = breakdownRows.find(r => r.rating === star)
      return { rating: star, count: row ? row.count : 0 }
    })

    // service areas + price range, derived from their current open listings
    const areaSet = new Set()
    listings.forEach(l => {
      const label = [l.area, l.district].filter(Boolean).join(', ')
      if (label) areaSet.add(label)
    })
    const rents = listings.map(l => l.rent).filter(r => r != null)

    const viewingTotal = viewingRows[0].total || 0
    const viewingResponded = viewingRows[0].responded || 0
    const viewingResponseRate = viewingTotal ? Math.round((viewingResponded / viewingTotal) * 100) : null

    res.json({
      success: true,
      data: {
        ...landlord,
        avg_rating: ratingRows[0].avg_rating || null,
        review_count: ratingRows[0].review_count || 0,
        rating_breakdown: ratingBreakdown,
        total_units: totalUnits,
        vacant_units: vacantUnits,
        occupied_units: occupiedUnits,
        occupancy_rate: occupancyRate,
        total_tenancies: trackRows[0].total_tenancies || 0,
        units_ever_rented: trackRows[0].units_ever_rented || 0,
        total_listings_posted: totalListingsRows[0].total || 0,
        service_areas: [...areaSet].slice(0, 8),
        rent_min: rents.length ? Math.min(...rents) : null,
        rent_max: rents.length ? Math.max(...rents) : null,
        viewing_requests_total: viewingTotal,
        viewing_response_rate: viewingResponseRate,
        listings: listings.map(l => ({ ...l, occupied: !!l.occupied }))
      }
    })
  } catch (err) {
    console.log('Public profile error:', err)
    res.json({ success: false, message: 'DB error' })
  }
})

// GET /api/landlord/:id/reviews — includes a verified_tenant flag when the
// reviewer actually had a tenancy under this landlord (real trust signal)
router.get('/:id/reviews', (req, res) => {
  db.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS student_name,
            EXISTS (
              SELECT 1 FROM tenancies t
              WHERE t.landlord_id = r.landlord_id AND t.tenant_user_id = r.student_id
            ) AS verified_tenant
     FROM landlord_reviews r
     JOIN users u ON u.id = r.student_id
     WHERE r.landlord_id = ?
     ORDER BY r.created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, data: rows.map(r => ({ ...r, verified_tenant: !!r.verified_tenant })) })
    }
  )
})

// POST /api/landlord/:id/reviews — a student leaves a review
router.post('/:id/reviews', (req, res) => {
  const { student_id, rating, comment, listing_id } = req.body
  if (!student_id || !rating) return res.json({ success: false, message: 'student_id and rating are required' })
  if (rating < 1 || rating > 5) return res.json({ success: false, message: 'Rating must be between 1 and 5' })

  db.query(
    `INSERT INTO landlord_reviews (landlord_id, student_id, listing_id, rating, comment) VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, student_id, listing_id || null, rating, comment || null],
    (err) => {
      if (err) { console.log('Review error:', err); return res.json({ success: false, message: 'DB error' }) }
      res.json({ success: true, message: 'Review submitted' })
    }
  )
})

/* ================================================================== */
/* C. MULTI-PROPERTY DASHBOARD                                         */
/* ================================================================== */

// GET /api/landlord/:id/dashboard — occupancy + revenue analytics + listing summary
router.get('/:id/dashboard', (req, res) => {
  const landlordId = req.params.id

  db.query(
    `SELECT l.id, l.title, l.property_group, l.rent, l.status, l.available_from,
            (SELECT COUNT(*) FROM tenancies t WHERE t.listing_id = l.id AND t.status = 'active') AS occupied
     FROM listings l WHERE l.landlord_id = ?
     ORDER BY l.property_group, l.title`,
    [landlordId],
    (err, listings) => {
      if (err) return res.json({ success: false, message: 'DB error' })

      const totalUnits = listings.length
      const occupiedUnits = listings.filter(l => l.occupied > 0).length
      const vacantUnits = totalUnits - occupiedUnits

      // occupancy grouped by property (for the bar chart, one bar per building)
      const groups = {}
      listings.forEach(l => {
        const key = l.property_group || 'Ungrouped'
        if (!groups[key]) groups[key] = { property_group: key, occupied: 0, vacant: 0 }
        if (l.occupied > 0) groups[key].occupied++
        else groups[key].vacant++
      })

      // revenue for the last 6 months
      db.query(
        `SELECT DATE_FORMAT(payment_month, '%Y-%m') AS month, SUM(amount) AS total
         FROM rent_payments
         WHERE landlord_id = ? AND payment_month >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY month ORDER BY month ASC`,
        [landlordId],
        (err2, revenueRows) => {
          if (err2) return res.json({ success: false, message: 'DB error' })

          // revenue for the last 6 months, broken down by *how* it was paid
          // (bkash / nagad / card / bank from the gateway, or 'cash' for
          // payments the landlord recorded manually) — feeds the
          // "Payments by Type" chart
          db.query(
            `SELECT COALESCE(payment_method, 'cash') AS payment_method, SUM(amount) AS total
             FROM rent_payments
             WHERE landlord_id = ? AND payment_month >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY COALESCE(payment_method, 'cash') ORDER BY total DESC`,
            [landlordId],
            (err3, methodRows) => {
              if (err3) return res.json({ success: false, message: 'DB error' })

              // revenue log — individual transactions, most recent first
              db.query(
                `SELECT rp.id, rp.amount, rp.payment_method, rp.payment_month, rp.created_at,
                        t.tenant_name, l.title AS listing_title
                 FROM rent_payments rp
                 JOIN tenancies t ON t.id = rp.tenancy_id
                 JOIN listings l ON l.id = t.listing_id
                 WHERE rp.landlord_id = ?
                 ORDER BY rp.created_at DESC
                 LIMIT 25`,
                [landlordId],
                (err4, logRows) => {
                  if (err4) return res.json({ success: false, message: 'DB error' })

                  res.json({
                    success: true,
                    data: {
                      total_units: totalUnits,
                      occupied_units: occupiedUnits,
                      vacant_units: vacantUnits,
                      occupancy_rate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
                      occupancy_by_property: Object.values(groups),
                      revenue_by_month: revenueRows,
                      revenue_by_method: methodRows,
                      revenue_log: logRows,
                      listings: listings.map(l => ({ ...l, occupied: l.occupied > 0 }))
                    }
                  })
                }
              )
            }
          )
        }
      )
    }
  )
})

// GET /api/landlord/:id/tenants — Tenant Contacts Hub: active tenants + viewing requests
router.get('/:id/tenants', (req, res) => {
  const landlordId = req.params.id

  db.query(
    `SELECT t.id, t.tenant_name, t.tenant_phone, t.rent_amount, t.start_date, t.status,
            l.id AS listing_id, l.title AS listing_title
     FROM tenancies t
     JOIN listings l ON l.id = t.listing_id
     WHERE t.landlord_id = ? AND t.status = 'active'
     ORDER BY t.start_date DESC`,
    [landlordId],
    (err, tenants) => {
      if (err) return res.json({ success: false, message: 'DB error' })

      db.query(
        `SELECT v.id, v.requested_date, v.message, v.status, v.created_at,
                l.id AS listing_id, l.title AS listing_title,
                u.id AS student_id, u.full_name AS student_name, u.phone AS student_phone
         FROM viewing_requests v
         JOIN listings l ON l.id = v.listing_id
         JOIN users u ON u.id = v.student_id
         WHERE v.landlord_id = ?
         ORDER BY v.created_at DESC`,
        [landlordId],
        (err2, requests) => {
          if (err2) return res.json({ success: false, message: 'DB error' })
          res.json({ success: true, data: { tenants, viewing_requests: requests } })
        }
      )
    }
  )
})

// POST /api/landlord/tenancies — move a tenant into a unit (marks it occupied)
router.post('/tenancies', async (req, res) => {
  const { listing_id, landlord_id, tenant_name, tenant_phone, tenant_user_id, rent_amount, start_date } = req.body
  if (!listing_id || !landlord_id || !tenant_name || !rent_amount || !start_date) {
    return res.json({ success: false, message: 'Missing required fields' })
  }

  // if the landlord didn't explicitly pick the student's account, try to
  // find one automatically by phone so the student can find "my rent"
  // later without needing to self-link
  let resolvedUserId = tenant_user_id || null
  if (!resolvedUserId && tenant_phone) {
    try {
      const matches = await q(`SELECT id FROM users WHERE phone = ? AND role = 'student' LIMIT 1`, [tenant_phone])
      if (matches.length > 0) resolvedUserId = matches[0].id
    } catch (e) { /* best-effort, not fatal */ }
  }

  db.query(
    `INSERT INTO tenancies (listing_id, landlord_id, tenant_name, tenant_phone, tenant_user_id, rent_amount, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [listing_id, landlord_id, tenant_name, tenant_phone || null, resolvedUserId, rent_amount, start_date],
    (err, result) => {
      if (err) { console.log('Tenancy error:', err); return res.json({ success: false, message: 'DB error' }) }
      res.json({ success: true, message: 'Tenant added', id: result.insertId })
    }
  )
})

// PUT /api/landlord/tenancies/:id/link-student — self-service link, for when
// the automatic phone match on creation didn't find the student's account
// (e.g. they registered with a different number than the landlord has on file)
router.put('/tenancies/:id/link-student', (req, res) => {
  const { user_id } = req.body
  if (!user_id) return res.json({ success: false, message: 'user_id is required' })
  db.query(`UPDATE tenancies SET tenant_user_id = ? WHERE id = ?`, [user_id, req.params.id], (err) => {
    if (err) return res.json({ success: false, message: 'DB error' })
    res.json({ success: true, message: 'Tenancy linked to your account' })
  })
})

// GET /api/landlord/tenancies/mine/:userId — the "what do I owe" lookup a
// logged-in student uses to find their own active rent to pay. Powers the
// "Pay Rent" card on the student Payments page.
router.get('/tenancies/mine/:userId', (req, res) => {
  db.query(
    `SELECT t.id, t.rent_amount, t.landlord_id, t.start_date,
            l.id AS listing_id, l.title AS listing_title
     FROM tenancies t
     JOIN listings l ON l.id = t.listing_id
     WHERE t.tenant_user_id = ? AND t.status = 'active'
     ORDER BY t.start_date DESC`,
    [req.params.userId],
    (err, rows) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, data: rows })
    }
  )
})

// PUT /api/landlord/tenancies/:id/end — end a tenancy (unit becomes vacant again)
router.put('/tenancies/:id/end', (req, res) => {
  db.query(
    `UPDATE tenancies SET status = 'ended', end_date = CURDATE() WHERE id = ?`,
    [req.params.id],
    (err) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, message: 'Tenancy ended' })
    }
  )
})

// POST /api/landlord/tenancies/:id/payment — record a rent payment (feeds the revenue graph)
// Used for payments collected outside the gateway (e.g. handed over in cash).
// Payments made through the gateway are recorded automatically by
// routes/payments.js and don't go through here.
router.post('/tenancies/:id/payment', (req, res) => {
  const { landlord_id, amount, payment_month, payment_method } = req.body
  if (!landlord_id || !amount || !payment_month) {
    return res.json({ success: false, message: 'Missing required fields' })
  }
  db.query(
    `INSERT INTO rent_payments (tenancy_id, landlord_id, amount, payment_method, payment_month) VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, landlord_id, amount, payment_method || 'cash', payment_month],
    (err) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, message: 'Payment recorded' })
    }
  )
})

// POST /api/landlord/viewing-requests — a student requests to view a unit
router.post('/viewing-requests', (req, res) => {
  const { listing_id, student_id, landlord_id, requested_date, message } = req.body
  if (!listing_id || !student_id || !landlord_id) {
    return res.json({ success: false, message: 'Missing required fields' })
  }
  db.query(
    `INSERT INTO viewing_requests (listing_id, student_id, landlord_id, requested_date, message) VALUES (?, ?, ?, ?, ?)`,
    [listing_id, student_id, landlord_id, requested_date || null, message || null],
    (err) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, message: 'Viewing request sent' })
    }
  )
})

// PUT /api/landlord/viewing-requests/:id — approve/decline a viewing request
router.put('/viewing-requests/:id', (req, res) => {
  const { status } = req.body
  if (!['approved', 'declined'].includes(status)) {
    return res.json({ success: false, message: 'Invalid status' })
  }
  db.query(`UPDATE viewing_requests SET status = ? WHERE id = ?`, [status, req.params.id], (err) => {
    if (err) return res.json({ success: false, message: 'DB error' })
    res.json({ success: true, message: `Request ${status}` })
  })
})

// PUT /api/landlord/listings/:id/quick-update — quick rent/status/grouping edit from the dashboard
router.put('/listings/:id/quick-update', (req, res) => {
  const { rent, status, property_group, available_from } = req.body
  db.query(
    `UPDATE listings SET rent = COALESCE(?, rent), status = COALESCE(?, status),
       property_group = COALESCE(?, property_group), available_from = COALESCE(?, available_from)
     WHERE id = ?`,
    [rent || null, status || null, property_group || null, available_from || null, req.params.id],
    (err) => {
      if (err) return res.json({ success: false, message: 'DB error' })
      res.json({ success: true, message: 'Listing updated' })
    }
  )
})

module.exports = router