const express = require('express')
const db = require('../config/db')

const router = express.Router()
const TARGET_TYPES = new Set(['roommate', 'landlord', 'room', 'property'])

function validateRating(value) {
  const rating = Number(value)
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
}

function validateTarget(type, id, callback) {
  if (type === 'roommate' || type === 'landlord') {
    const expectedRole = type === 'roommate' ? 'student' : 'landlord'
    return db.query(
      'SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1',
      [id, expectedRole],
      (err, rows) => callback(err, rows && rows.length > 0)
    )
  }

  return db.query(
    'SELECT id FROM listings WHERE id = ? LIMIT 1',
    [id],
    (err, rows) => callback(err, rows && rows.length > 0)
  )
}

// GET /api/reviews/:targetType/:targetId
// Returns reviews plus average rating and total count.
router.get('/:targetType/:targetId', (req, res) => {
  const { targetType, targetId } = req.params

  if (!TARGET_TYPES.has(targetType) || !Number.isInteger(Number(targetId))) {
    return res.status(400).json({ success: false, message: 'Invalid review target.' })
  }

  const sql = `
    SELECT
      r.id,
      r.reviewer_id,
      r.target_type,
      r.target_id,
      r.rating,
      r.review_text,
      r.created_at,
      r.updated_at,
      u.full_name AS reviewer_name
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    WHERE r.target_type = ? AND r.target_id = ?
    ORDER BY r.created_at DESC
  `

  db.query(sql, [targetType, targetId], (err, rows) => {
    if (err) {
      console.log('Fetch reviews error:', err)
      return res.status(500).json({ success: false, message: 'Could not load reviews.' })
    }

    const total = rows.length
    const average = total
      ? Number((rows.reduce((sum, row) => sum + Number(row.rating), 0) / total).toFixed(1))
      : 0

    res.json({ success: true, average_rating: average, review_count: total, data: rows })
  })
})

// POST /api/reviews
// Body: reviewer_id, target_type, target_id, rating (1-5), review_text
router.post('/', (req, res) => {
  const { reviewer_id, target_type, target_id, rating, review_text } = req.body

  if (!reviewer_id || !target_id || !TARGET_TYPES.has(target_type)) {
    return res.status(400).json({ success: false, message: 'Reviewer and valid target are required.' })
  }

  if (!validateRating(rating)) {
    return res.status(400).json({ success: false, message: 'Rating must be an integer from 1 to 5.' })
  }

  if (!review_text || !review_text.trim()) {
    return res.status(400).json({ success: false, message: 'Review text is required.' })
  }

  if (review_text.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Review must be 2000 characters or fewer.' })
  }

  if ((target_type === 'roommate' || target_type === 'landlord') && Number(reviewer_id) === Number(target_id)) {
    return res.status(400).json({ success: false, message: 'You cannot review yourself.' })
  }

  db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [reviewer_id], (reviewerErr, reviewers) => {
    if (reviewerErr) {
      console.log('Reviewer lookup error:', reviewerErr)
      return res.status(500).json({ success: false, message: 'Could not verify reviewer.' })
    }

    if (!reviewers.length) {
      return res.status(404).json({ success: false, message: 'Reviewer not found.' })
    }

    validateTarget(target_type, target_id, (targetErr, exists) => {
      if (targetErr) {
        console.log('Review target lookup error:', targetErr)
        return res.status(500).json({ success: false, message: 'Could not verify review target.' })
      }

      if (!exists) {
        return res.status(404).json({ success: false, message: 'Review target not found.' })
      }

      const sql = `
        INSERT INTO reviews (reviewer_id, target_type, target_id, rating, review_text)
        VALUES (?, ?, ?, ?, ?)
      `

      db.query(sql, [reviewer_id, target_type, target_id, Number(rating), review_text.trim()], (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
              success: false,
              message: 'You already reviewed this item. Edit your existing review instead.'
            })
          }
          console.log('Create review error:', err)
          return res.status(500).json({ success: false, message: 'Could not submit review.' })
        }

        res.status(201).json({ success: true, message: 'Review submitted.', review_id: result.insertId })
      })
    })
  })
})

// PUT /api/reviews/:id
// Reviewer ID is required so one user cannot edit another user's review.
router.put('/:id', (req, res) => {
  const { reviewer_id, rating, review_text } = req.body

  if (!reviewer_id || !validateRating(rating) || !review_text || !review_text.trim()) {
    return res.status(400).json({ success: false, message: 'Reviewer, rating (1-5), and review text are required.' })
  }

  if (review_text.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Review must be 2000 characters or fewer.' })
  }

  db.query(
    'UPDATE reviews SET rating = ?, review_text = ? WHERE id = ? AND reviewer_id = ?',
    [Number(rating), review_text.trim(), req.params.id, reviewer_id],
    (err, result) => {
      if (err) {
        console.log('Update review error:', err)
        return res.status(500).json({ success: false, message: 'Could not update review.' })
      }
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: 'Review not found or not owned by this reviewer.' })
      }
      res.json({ success: true, message: 'Review updated.' })
    }
  )
})

// DELETE /api/reviews/:id?reviewer_id=123
router.delete('/:id', (req, res) => {
  const { reviewer_id } = req.query
  if (!reviewer_id) {
    return res.status(400).json({ success: false, message: 'reviewer_id is required.' })
  }

  db.query(
    'DELETE FROM reviews WHERE id = ? AND reviewer_id = ?',
    [req.params.id, reviewer_id],
    (err, result) => {
      if (err) {
        console.log('Delete review error:', err)
        return res.status(500).json({ success: false, message: 'Could not delete review.' })
      }
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: 'Review not found or not owned by this reviewer.' })
      }
      res.json({ success: true, message: 'Review deleted.' })
    }
  )
})

module.exports = router
