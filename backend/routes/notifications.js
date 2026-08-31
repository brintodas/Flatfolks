/**
 * routes/notifications.js
 * Generic notification inbox, polled by the frontend (NotificationsBell.jsx).
 * Mounted at: /api/notifications
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// GET /api/notifications/:userId — recent notifications + unread count
// Optional ?since=<ISO timestamp> to only fetch what's new since the last poll.
router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  const { since } = req.query
  try {
    const params = [userId]
    let sql = `SELECT id, type, title, message, related_type, related_id, is_read, created_at
               FROM notifications WHERE user_id = ?`
    if (since) {
      sql += ` AND created_at > ?`
      params.push(since)
    }
    sql += ` ORDER BY created_at DESC LIMIT 50`

    const items = await query(sql, params)
    const unreadRows = await query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    )

    res.json({ success: true, data: items, unread_count: unreadRows[0].unread })
  } catch (err) {
    console.error('Notifications fetch error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Notification read error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT /api/notifications/mark-all-read  Body: { user_id }
router.put('/mark-all-read', async (req, res) => {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' })
  try {
    await query(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [user_id])
    res.json({ success: true })
  } catch (err) {
    console.error('Mark-all-read error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router