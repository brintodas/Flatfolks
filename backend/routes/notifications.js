/**
 * routes/notifications.js
 * In-App Notifications API
 * Mounted at: /api/notifications
 */
const express = require('express')
const router  = express.Router()
const db      = require('../config/db')

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// ─── GET /api/notifications?user_id=X ───────────────────────
router.get('/', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required.' })
  }
  try {
    // Attempting to select body, due_date from rent_reminders branch, 
    // and message, related_type, related_id from payments_schema. 
    // We'll use SELECT * so it works regardless of which migration ran last.
    const notifications = await query(
      `SELECT *
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [user_id]
    )
    const unreadCount = notifications.filter(n => !n.is_read).length
    res.json({ success: true, unreadCount, data: notifications })
  } catch (err) {
    console.error('GET /notifications error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// GET /api/notifications/:userId — recent notifications + unread count (From payment-gateway)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  const { since } = req.query
  try {
    const params = [userId]
    let sql = `SELECT * FROM notifications WHERE user_id = ?`
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

// ─── PATCH /api/notifications/read-all ──────────────────────
// Must be before /:id/read to avoid route collision
router.patch('/read-all', async (req, res) => {
  const { user_id } = req.body
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required.' })
  }
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [user_id])
    res.json({ success: true, message: 'All notifications marked as read.' })
  } catch (err) {
    console.error('PATCH /notifications/read-all error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// PUT /api/notifications/mark-all-read (From payment-gateway)
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

// ─── PATCH /api/notifications/:id/read ──────────────────────
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params
  try {
    const result = await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id])
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Notification not found.' })
    }
    res.json({ success: true, message: 'Notification marked as read.' })
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// PUT /api/notifications/:id/read (From payment-gateway)
router.put('/:id/read', async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Notification read error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// ─── DELETE /api/notifications/:id ──────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await query('DELETE FROM notifications WHERE id = ?', [id])
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Notification not found.' })
    }
    res.json({ success: true, message: 'Notification deleted.' })
  } catch (err) {
    console.error('DELETE /notifications/:id error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

module.exports = router
