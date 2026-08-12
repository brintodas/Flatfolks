const express = require('express')
const router = express.Router()
const db = require('../config/db')

// POST /api/bookmarks  – toggle bookmark on/off
router.post('/', (req, res) => {
  const { listing_id, user_key } = req.body
  if (!listing_id || !user_key) {
    return res.json({ success: false, message: 'listing_id and user_key required' })
  }

  // check if already bookmarked
  db.query('SELECT id FROM bookmarks WHERE listing_id = ? AND user_key = ?', [listing_id, user_key], (err, rows) => {
    if (err) return res.json({ success: false, message: 'DB error' })

    if (rows.length > 0) {
      // already bookmarked – remove it
      db.query('DELETE FROM bookmarks WHERE listing_id = ? AND user_key = ?', [listing_id, user_key], (err2) => {
        if (err2) return res.json({ success: false, message: 'DB error' })
        res.json({ success: true, bookmarked: false })
      })
    } else {
      // not bookmarked – get current rent then save
      db.query('SELECT rent FROM listings WHERE id = ?', [listing_id], (err3, listing) => {
        if (err3 || listing.length === 0) return res.json({ success: false, message: 'Listing not found' })
        const last_rent = listing[0].rent
        db.query(
          'INSERT INTO bookmarks (listing_id, user_key, last_rent) VALUES (?, ?, ?)',
          [listing_id, user_key, last_rent],
          (err4) => {
            if (err4) return res.json({ success: false, message: 'DB error' })
            res.json({ success: true, bookmarked: true })
          }
        )
      })
    }
  })
})

// GET /api/bookmarks?user_key=xxx  – get all bookmarked listings for a user
// also checks for rent drops and availability changes
router.get('/', (req, res) => {
  const { user_key } = req.query
  if (!user_key) return res.json({ success: false, message: 'user_key required' })

  const sql = `
    SELECT
      l.*,
      b.id        AS bookmark_id,
      b.last_rent AS bookmarked_rent,
      b.created_at AS bookmarked_at,
      CASE
        WHEN l.rent < b.last_rent THEN 1
        ELSE 0
      END AS rent_dropped,
      (b.last_rent - l.rent) AS rent_drop_amount
    FROM bookmarks b
    JOIN listings l ON l.id = b.listing_id
    WHERE b.user_key = ?
    ORDER BY b.created_at DESC
  `

  db.query(sql, [user_key], (err, results) => {
    if (err) {
      console.log('Error fetching bookmarks:', err)
      return res.json({ success: false, message: 'Failed to fetch bookmarks' })
    }

    // update last_rent snapshot after notifying
    results.forEach(row => {
      if (row.rent_dropped) {
        db.query(
          'UPDATE bookmarks SET last_rent = ?, notified = 1 WHERE id = ?',
          [row.rent, row.bookmark_id]
        )
      }
    })

    res.json({ success: true, data: results })
  })
})

// GET /api/bookmarks/ids?user_key=xxx  – just the bookmarked listing IDs (for heart state)
router.get('/ids', (req, res) => {
  const { user_key } = req.query
  if (!user_key) return res.json({ success: false, data: [] })

  db.query('SELECT listing_id FROM bookmarks WHERE user_key = ?', [user_key], (err, rows) => {
    if (err) return res.json({ success: false, data: [] })
    res.json({ success: true, data: rows.map(r => r.listing_id) })
  })
})

module.exports = router
