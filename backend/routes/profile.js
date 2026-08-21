const express = require('express')
const router  = express.Router()
const db      = require('../config/db')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')

// save profile photos to uploads/profiles/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/profiles')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `user_${Date.now()}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new Error('Only JPG, PNG, or WEBP images are allowed'))
  }
})

// Helper: compute weighted match score between viewer and a candidate row
// Returns { total: 0-100, breakdown: { trait: score } } or null if quiz incomplete
function computeMatchScore(viewer, candidate) {
  const TRAITS = ['sleep_schedule', 'cleanliness', 'noise_tolerance', 'guests_pref', 'smoking_pref', 'study_habits']
  if (!viewer || !viewer.quiz_completed || !candidate.quiz_completed) return null

  let weightedSum = 0
  let totalWeight = 0
  const breakdown = {}

  for (const trait of TRAITS) {
    const av = Number(viewer[trait])
    const bv = Number(candidate[trait])
    const w  = Number(viewer[`w_${trait}`] || 3)
    if (!av || !bv) return null            // answer missing → can't score
    const diff  = Math.abs(av - bv)
    const score = diff === 0 ? 100 : diff === 1 ? 50 : 0
    breakdown[trait] = score
    weightedSum += score * w
    totalWeight += w
  }

  const total = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
  return { total, breakdown }
}

// GET /api/profile — list all students (with optional filters)
// Pass ?viewer_id=<id> to get personalized match scores sorted by compatibility.
router.get('/', (req, res) => {
  const { search, district, area, budget_max, room_type, viewer_id } = req.query

  let sql = `
    SELECT
      u.id AS user_id, u.full_name, u.email, u.department, u.semester, u.gender,
      u.budget_min AS user_budget_min, u.budget_max AS user_budget_max,
      u.preferred_district AS user_preferred_district,
      u.preferred_area     AS user_preferred_area,
      sp.university, sp.course, sp.year_of_study, sp.bio, sp.profile_photo,
      sp.budget_min, sp.budget_max,
      sp.preferred_district, sp.preferred_area,
      sp.move_in_timeframe, sp.room_type, sp.personality_tags,
      sp.quiz_completed,
      sp.sleep_schedule, sp.cleanliness, sp.noise_tolerance,
      sp.guests_pref, sp.smoking_pref, sp.study_habits
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'student'`

  const params = []

  if (search) {
    sql += ` AND (u.full_name LIKE ? OR u.department LIKE ? OR sp.bio LIKE ?)`
    const like = `%${search}%`
    params.push(like, like, like)
  }
  if (district) {
    sql += ` AND (sp.preferred_district = ? OR (sp.preferred_district IS NULL AND u.preferred_district = ?))`
    params.push(district, district)
  }
  if (area) {
    sql += ` AND (sp.preferred_area = ? OR (sp.preferred_area IS NULL AND u.preferred_area = ?))`
    params.push(area, area)
  }
  if (budget_max) {
    sql += ` AND (COALESCE(sp.budget_max, u.budget_max) <= ?)`
    params.push(Number(budget_max))
  }
  if (room_type) {
    sql += ` AND sp.room_type = ?`
    params.push(room_type)
  }

  sql += ` ORDER BY sp.id DESC, u.created_at DESC`

  db.query(sql, params, (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }

    // merge fallback fields
    let data = rows.map(row => ({
      ...row,
      budget_min:         row.budget_min         != null ? row.budget_min         : row.user_budget_min,
      budget_max:         row.budget_max         != null ? row.budget_max         : row.user_budget_max,
      preferred_district: row.preferred_district != null ? row.preferred_district : row.user_preferred_district,
      preferred_area:     row.preferred_area     != null ? row.preferred_area     : row.user_preferred_area,
    }))

    // If viewer_id provided, fetch viewer profile and compute personalized scores
    if (!viewer_id) {
      return res.json({ success: true, data, total: data.length })
    }

    db.query(
      `SELECT sp.*, u.id AS user_id FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.user_id = ?`,
      [viewer_id],
      (err2, viewerRows) => {
        if (err2) { console.error(err2); return res.status(500).json({ error: 'Server error' }) }
        const viewer = viewerRows[0] || null

        // attach match_score + breakdown to each candidate
        data = data.map(candidate => {
          const result = computeMatchScore(viewer, candidate)
          return {
            ...candidate,
            match_score: result ? result.total : null,
            match_breakdown: result ? result.breakdown : null,
          }
        })

        // sort: scored DESC first, unscored last
        data.sort((a, b) => {
          if (a.match_score == null && b.match_score == null) return 0
          if (a.match_score == null) return 1
          if (b.match_score == null) return -1
          return b.match_score - a.match_score
        })

        res.json({ success: true, data, total: data.length })
      }
    )
  })
})

// GET /api/profile/:userId — fetch profile, falling back to signup data
router.get('/:userId', (req, res) => {
  const { userId } = req.params
  const sql = `
    SELECT
      u.id AS user_id,
      u.full_name, u.email, u.department, u.semester, u.gender,
      u.budget_min    AS user_budget_min,
      u.budget_max    AS user_budget_max,
      u.preferred_district AS user_preferred_district,
      u.preferred_area     AS user_preferred_area,
      sp.id AS profile_id,
      sp.university, sp.course, sp.year_of_study, sp.bio, sp.profile_photo,
      sp.budget_min, sp.budget_max,
      sp.preferred_district, sp.preferred_area,
      sp.move_in_timeframe, sp.room_type, sp.personality_tags,
      sp.sleep_schedule, sp.cleanliness, sp.noise_tolerance,
      sp.guests_pref, sp.smoking_pref, sp.study_habits,
      sp.quiz_completed,
      sp.w_sleep_schedule, sp.w_cleanliness, sp.w_noise_tolerance,
      sp.w_guests_pref, sp.w_smoking_pref, sp.w_study_habits
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.id = ?`

  db.query(sql, [userId], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const row = rows[0]
    // use student_profiles values if set, otherwise fall back to signup values
    res.json({
      ...row,
      budget_min:         row.budget_min         != null ? row.budget_min         : row.user_budget_min,
      budget_max:         row.budget_max         != null ? row.budget_max         : row.user_budget_max,
      preferred_district: row.preferred_district != null ? row.preferred_district : row.user_preferred_district,
      preferred_area:     row.preferred_area     != null ? row.preferred_area     : row.user_preferred_area,
    })
  })
})

// POST /api/profile — create or update a student's profile (upsert)
router.post('/', (req, res) => {
  const {
    user_id, university, course, year_of_study, bio,
    budget_min, budget_max,
    preferred_district, preferred_area,
    move_in_timeframe, room_type, personality_tags,
    // quiz answers
    sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits,
    quiz_completed,
    // priority weights (1–5)
    w_sleep_schedule, w_cleanliness, w_noise_tolerance, w_guests_pref, w_smoking_pref, w_study_habits
  } = req.body

  if (!user_id) return res.status(400).json({ error: 'user_id is required' })

  db.query('SELECT id, role FROM users WHERE id = ?', [user_id], (err, users) => {
    if (err) return res.status(500).json({ error: 'Server error' })
    if (users.length === 0) return res.status(404).json({ error: 'User not found' })
    if (users[0].role !== 'student') return res.status(403).json({ error: 'Only students can have a roommate profile' })

    const tags = Array.isArray(personality_tags) ? personality_tags.join(',') : personality_tags

    const sql = `
      INSERT INTO student_profiles
        (user_id, university, course, year_of_study, bio, budget_min, budget_max,
         preferred_district, preferred_area, move_in_timeframe, room_type, personality_tags,
         sleep_schedule, cleanliness, noise_tolerance, guests_pref, smoking_pref, study_habits,
         quiz_completed,
         w_sleep_schedule, w_cleanliness, w_noise_tolerance, w_guests_pref, w_smoking_pref, w_study_habits)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        university         = VALUES(university),
        course             = VALUES(course),
        year_of_study      = VALUES(year_of_study),
        bio                = VALUES(bio),
        budget_min         = VALUES(budget_min),
        budget_max         = VALUES(budget_max),
        preferred_district = VALUES(preferred_district),
        preferred_area     = VALUES(preferred_area),
        move_in_timeframe  = VALUES(move_in_timeframe),
        room_type          = VALUES(room_type),
        personality_tags   = VALUES(personality_tags),
        sleep_schedule     = VALUES(sleep_schedule),
        cleanliness        = VALUES(cleanliness),
        noise_tolerance    = VALUES(noise_tolerance),
        guests_pref        = VALUES(guests_pref),
        smoking_pref       = VALUES(smoking_pref),
        study_habits       = VALUES(study_habits),
        quiz_completed     = VALUES(quiz_completed),
        w_sleep_schedule   = VALUES(w_sleep_schedule),
        w_cleanliness      = VALUES(w_cleanliness),
        w_noise_tolerance  = VALUES(w_noise_tolerance),
        w_guests_pref      = VALUES(w_guests_pref),
        w_smoking_pref     = VALUES(w_smoking_pref),
        w_study_habits     = VALUES(w_study_habits)`

    db.query(sql, [
      user_id, university, course, year_of_study, bio, budget_min, budget_max,
      preferred_district, preferred_area, move_in_timeframe, room_type, tags,
      sleep_schedule || null, cleanliness || null, noise_tolerance || null,
      guests_pref || null, smoking_pref || null, study_habits || null,
      quiz_completed ? 1 : 0,
      w_sleep_schedule || 3, w_cleanliness || 3, w_noise_tolerance || 3,
      w_guests_pref || 3, w_smoking_pref || 3, w_study_habits || 3
    ], (err2) => {
      if (err2) { console.error(err2); return res.status(500).json({ error: 'Server error' }) }

      db.query(
        `SELECT sp.*, u.full_name FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.user_id = ?`,
        [user_id], (err3, rows) => {
          if (err3) return res.status(500).json({ error: 'Server error' })
          res.json({ success: true, profile: rows[0] })
        }
      )
    })
  })
})

// POST /api/profile/upload-photo — upload or replace a student's profile picture
router.post('/upload-photo', upload.single('photo'), (req, res) => {
  const { user_id } = req.body
  if (!user_id)  return res.status(400).json({ error: 'user_id is required' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const photoUrl = `/uploads/profiles/${req.file.filename}`

  db.query(
    `INSERT INTO student_profiles (user_id, profile_photo)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE profile_photo = VALUES(profile_photo)`,
    [user_id, photoUrl],
    (err) => {
      if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
      res.json({ success: true, photo_url: photoUrl })
    }
  )
})

module.exports = router
