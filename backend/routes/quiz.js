const express = require('express')
const router = express.Router()
const db = require('../config/db')

const QUIZ_FIELDS = [
  'sleep_schedule',
  'cleanliness',
  'noise_tolerance',
  'guests_pref',
  'smoking_pref',
  'study_habits',
]

function isValidScore(n) {
  const v = Number(n)
  return Number.isInteger(v) && v >= 1 && v <= 3
}

function calcCompatibility(a, b) {
  let diff = 0
  for (const key of QUIZ_FIELDS) {
    const av = Number(a[key])
    const bv = Number(b[key])
    if (!av || !bv) return null
    diff += Math.abs(av - bv)
  }
  // each axis differs by at most 2 → max total diff 12
  return Math.round(100 - (diff / 12) * 100)
}

// POST /api/quiz — save lifestyle quiz answers for a student
router.post('/', (req, res) => {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' })

  for (const key of QUIZ_FIELDS) {
    if (!isValidScore(req.body[key])) {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${key}. Expected 1, 2, or 3.`,
      })
    }
  }

  db.query('SELECT id, role FROM users WHERE id = ?', [user_id], (err, users) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' })
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' })
    if (users[0].role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can take the lifestyle quiz' })
    }

    const values = QUIZ_FIELDS.map((k) => Number(req.body[k]))

    const sql = `
      INSERT INTO student_profiles
        (user_id, sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits, quiz_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        sleep_schedule  = VALUES(sleep_schedule),
        cleanliness     = VALUES(cleanliness),
        noise_tolerance = VALUES(noise_tolerance),
        guests_pref     = VALUES(guests_pref),
        smoking_pref    = VALUES(smoking_pref),
        study_habits    = VALUES(study_habits),
        quiz_completed  = 1`

    db.query(sql, [user_id, ...values], (err2) => {
      if (err2) {
        console.error(err2)
        return res.status(500).json({ success: false, message: 'Server error' })
      }

      db.query(
        `SELECT sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits, quiz_completed
         FROM student_profiles WHERE user_id = ?`,
        [user_id],
        (err3, rows) => {
          if (err3) return res.status(500).json({ success: false, message: 'Server error' })
          res.json({ success: true, quiz: rows[0] })
        }
      )
    })
  })
})

// GET /api/quiz/compatibility?user_id=&other_id= — pairwise compatibility %
router.get('/compatibility', (req, res) => {
  const userId = Number(req.query.user_id)
  const otherId = Number(req.query.other_id)
  if (!userId || !otherId) {
    return res.status(400).json({ success: false, message: 'user_id and other_id are required' })
  }
  if (userId === otherId) {
    return res.json({ success: true, score: null, message: 'Cannot compare with yourself' })
  }

  const sql = `
    SELECT user_id, sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits, quiz_completed
    FROM student_profiles
    WHERE user_id IN (?, ?)`

  db.query(sql, [userId, otherId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' })
    const mine = rows.find((r) => r.user_id === userId)
    const other = rows.find((r) => r.user_id === otherId)
    if (!mine?.quiz_completed || !other?.quiz_completed) {
      return res.json({
        success: true,
        score: null,
        message: 'Both students must complete the lifestyle quiz',
      })
    }
    res.json({ success: true, score: calcCompatibility(mine, other) })
  })
})

module.exports = router
