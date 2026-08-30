/**
 * routes/reminders.js
 *
 * Rent Due Date Reminder Settings API
 * Mounted at: /api/reminders
 *
 * GET    /:userId    — Fetch a student's active reminder setting
 * POST   /           — Create or update a reminder (upsert)
 * DELETE /:userId    — Deactivate the reminder
 */
const express = require('express')
const router  = express.Router()
const db      = require('../config/db')

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// ─── GET /api/reminders/:userId ──────────────────────────────
router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const rows = await query(
      `SELECT r.*, u.full_name FROM rent_reminders r
       JOIN users u ON u.id = r.user_id
       WHERE r.user_id = ? LIMIT 1`,
      [userId]
    )
    if (!rows.length) {
      return res.json({ success: true, reminder: null })
    }
    res.json({ success: true, reminder: rows[0] })
  } catch (err) {
    console.error('GET /reminders error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// ─── POST /api/reminders ─────────────────────────────────────
// Body: { user_id, due_day (1-31), rent_amount? }
router.post('/', async (req, res) => {
  const { user_id, due_day, rent_amount } = req.body

  if (!user_id || !due_day) {
    return res.status(400).json({ success: false, message: 'user_id and due_day are required.' })
  }

  const day = parseInt(due_day, 10)
  if (isNaN(day) || day < 1 || day > 31) {
    return res.status(400).json({ success: false, message: 'due_day must be between 1 and 31.' })
  }

  const amount = rent_amount ? parseFloat(rent_amount) : null
  if (rent_amount && (isNaN(amount) || amount <= 0)) {
    return res.status(400).json({ success: false, message: 'rent_amount must be a positive number.' })
  }

  try {
    // Confirm the user is a student
    const users = await query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [user_id])
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found.' })
    if (users[0].role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can set rent reminders.' })
    }

    await query(
      `INSERT INTO rent_reminders (user_id, due_day, rent_amount, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         due_day     = VALUES(due_day),
         rent_amount = VALUES(rent_amount),
         is_active   = 1`,
      [user_id, day, amount]
    )

    const [reminder] = await query('SELECT * FROM rent_reminders WHERE user_id = ?', [user_id])
    res.json({ success: true, message: 'Reminder saved.', reminder })
  } catch (err) {
    console.error('POST /reminders error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// ─── DELETE /api/reminders/:userId ───────────────────────────
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    await query('UPDATE rent_reminders SET is_active = 0 WHERE user_id = ?', [userId])
    res.json({ success: true, message: 'Reminder disabled.' })
  } catch (err) {
    console.error('DELETE /reminders error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

module.exports = router
