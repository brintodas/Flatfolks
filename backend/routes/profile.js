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

// GET /api/profile — list all students (with optional filters)
router.get('/', (req, res) => {
  const { search, district, area, budget_max, room_type } = req.query

  let sql = `
    SELECT
      u.id AS user_id, u.full_name, u.email, u.department, u.semester, u.gender,
      u.budget_min AS user_budget_min, u.budget_max AS user_budget_max,
      u.preferred_district AS user_preferred_district,
      u.preferred_area     AS user_preferred_area,
      sp.course, sp.year_of_study, sp.bio, sp.profile_photo,
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
    const data = rows.map(row => ({
      ...row,
      budget_min:         row.budget_min         != null ? row.budget_min         : row.user_budget_min,
      budget_max:         row.budget_max         != null ? row.budget_max         : row.user_budget_max,
      preferred_district: row.preferred_district != null ? row.preferred_district : row.user_preferred_district,
      preferred_area:     row.preferred_area     != null ? row.preferred_area     : row.user_preferred_area,
    }))
    res.json({ success: true, data, total: data.length })
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
      sp.course, sp.year_of_study, sp.bio, sp.profile_photo,
      sp.budget_min, sp.budget_max,
      sp.preferred_district, sp.preferred_area,
      sp.move_in_timeframe, sp.room_type, sp.personality_tags,
      sp.sleep_schedule, sp.cleanliness, sp.noise_tolerance,
      sp.guests_pref, sp.smoking_pref, sp.study_habits,
      sp.quiz_completed
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
    user_id, course, year_of_study, bio,
    budget_min, budget_max,
    preferred_district, preferred_area,
    move_in_timeframe, room_type, personality_tags
  } = req.body

  if (!user_id) return res.status(400).json({ error: 'user_id is required' })

  db.query('SELECT id, role FROM users WHERE id = ?', [user_id], (err, users) => {
    if (err) return res.status(500).json({ error: 'Server error' })
    if (users.length === 0) return res.status(404).json({ error: 'User not found' })
    if (users[0].role !== 'student') return res.status(403).json({ error: 'Only students can have a roommate profile' })

    const tags = Array.isArray(personality_tags) ? personality_tags.join(',') : personality_tags

    const sql = `
      INSERT INTO student_profiles
        (user_id, course, year_of_study, bio, budget_min, budget_max,
         preferred_district, preferred_area, move_in_timeframe, room_type, personality_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        course             = VALUES(course),
        year_of_study      = VALUES(year_of_study),
        bio                = VALUES(bio),
        budget_min         = VALUES(budget_min),
        budget_max         = VALUES(budget_max),
        preferred_district = VALUES(preferred_district),
        preferred_area     = VALUES(preferred_area),
        move_in_timeframe  = VALUES(move_in_timeframe),
        room_type          = VALUES(room_type),
        personality_tags   = VALUES(personality_tags)`

    db.query(sql, [user_id, course, year_of_study, bio, budget_min, budget_max,
      preferred_district, preferred_area, move_in_timeframe, room_type, tags], (err2) => {
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
