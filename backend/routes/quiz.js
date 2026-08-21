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

const WEIGHT_FIELDS = QUIZ_FIELDS.map((f) => `w_${f}`)

function isValidScore(n) {
  const v = Number(n)
  return Number.isInteger(v) && v >= 1 && v <= 3
}

function isValidWeight(n) {
  const v = Number(n)
  return Number.isInteger(v) && v >= 1 && v <= 5
}

// POST /api/quiz — save lifestyle quiz answers + priority weights for a student
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
    const wKey = `w_${key}`
    if (req.body[wKey] != null && !isValidWeight(req.body[wKey])) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority for ${wKey}. Expected 1–5.`,
      })
    }
  }

  db.query('SELECT id, role FROM users WHERE id = ?', [user_id], (err, users) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' })
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' })
    if (users[0].role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can take the lifestyle quiz' })
    }

    const answerValues = QUIZ_FIELDS.map((k) => Number(req.body[k]))
    const weightValues = QUIZ_FIELDS.map((k) => Number(req.body[`w_${k}`] || 3))

    const sql = `
      INSERT INTO student_profiles
        (user_id, sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits, quiz_completed,
         w_sleep_schedule, w_cleanliness, w_noise_tolerance, w_guests_pref, w_smoking_pref, w_study_habits)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sleep_schedule    = VALUES(sleep_schedule),
        cleanliness       = VALUES(cleanliness),
        noise_tolerance   = VALUES(noise_tolerance),
        guests_pref       = VALUES(guests_pref),
        smoking_pref      = VALUES(smoking_pref),
        study_habits      = VALUES(study_habits),
        quiz_completed    = 1,
        w_sleep_schedule  = VALUES(w_sleep_schedule),
        w_cleanliness     = VALUES(w_cleanliness),
        w_noise_tolerance = VALUES(w_noise_tolerance),
        w_guests_pref     = VALUES(w_guests_pref),
        w_smoking_pref    = VALUES(w_smoking_pref),
        w_study_habits    = VALUES(w_study_habits)`

    db.query(sql, [user_id, ...answerValues, ...weightValues], (err2) => {
      if (err2) {
        console.error(err2)
        return res.status(500).json({ success: false, message: 'Server error' })
      }

      db.query(
        `SELECT sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits, quiz_completed,
                w_sleep_schedule, w_cleanliness, w_noise_tolerance, w_guests_pref, w_smoking_pref, w_study_habits
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
  const userId  = Number(req.query.user_id)
  const otherId = Number(req.query.other_id)
  if (!userId || !otherId) {
    return res.status(400).json({ success: false, message: 'user_id and other_id are required' })
  }
  if (userId === otherId) {
    return res.json({ success: true, score: null, message: 'Cannot compare with yourself' })
  }

  const sql = `
    SELECT user_id,
           sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits, quiz_completed,
           w_sleep_schedule, w_cleanliness, w_noise_tolerance, w_guests_pref, w_smoking_pref, w_study_habits
    FROM student_profiles
    WHERE user_id IN (?, ?)`

  db.query(sql, [userId, otherId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' })
    const mine  = rows.find((r) => r.user_id === userId)
    const other = rows.find((r) => r.user_id === otherId)
    if (!mine?.quiz_completed || !other?.quiz_completed) {
      return res.json({ success: true, score: null, message: 'Both students must complete the lifestyle quiz' })
    }

    // Use viewer (mine) weights for personalized scoring
    const TRAITS = ['sleep_schedule', 'cleanliness', 'noise_tolerance', 'guests_pref', 'smoking_pref', 'study_habits']
    let weightedSum = 0, totalWeight = 0
    for (const trait of TRAITS) {
      const diff  = Math.abs(Number(mine[trait]) - Number(other[trait]))
      const score = diff === 0 ? 100 : diff === 1 ? 50 : 0
      const w     = Number(mine[`w_${trait}`] || 3)
      weightedSum += score * w
      totalWeight += w
    }
    const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
    res.json({ success: true, score })
  })
})

module.exports = router
