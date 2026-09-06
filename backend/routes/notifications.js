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

// ─── GET /api/notifications?user_id=X&type=Y ───────────────────────
router.get('/', async (req, res) => {
  const { user_id, type } = req.query
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required.' })
  }
  try {
    let sql = `SELECT * FROM notifications WHERE user_id = ?`
    const params = [user_id]
    
    if (type) {
      if (type === 'rent_reminder') {
        sql += ` AND type LIKE 'rent_reminder%'`
      } else if (type === 'system') {
        sql += ` AND type NOT LIKE 'rent_reminder%'`
      } else {
        sql += ` AND type = ?`
        params.push(type)
      }
    }
    
    sql += ` ORDER BY created_at DESC LIMIT 30`
    
    const notifications = await query(sql, params)
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
  const { since, type } = req.query
  try {
    const params = [userId]
    let sql = `SELECT * FROM notifications WHERE user_id = ?`
    
    if (type) {
      if (type === 'rent_reminder') {
        sql += ` AND type LIKE 'rent_reminder%'`
      } else if (type === 'system') {
        sql += ` AND type NOT LIKE 'rent_reminder%'`
      } else {
        sql += ` AND type = ?`
        params.push(type)
      }
    }
    
    if (since) {
      sql += ` AND created_at > ?`
      params.push(since)
    }
    sql += ` ORDER BY created_at DESC LIMIT 50`

    const items = await query(sql, params)
    
    let unreadSql = `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`
    const unreadParams = [userId]
    if (type) {
      if (type === 'rent_reminder') {
        unreadSql += ` AND type LIKE 'rent_reminder%'`
      } else if (type === 'system') {
        unreadSql += ` AND type NOT LIKE 'rent_reminder%'`
      } else {
        unreadSql += ` AND type = ?`
        unreadParams.push(type)
      }
    }
    
    const unreadRows = await query(unreadSql, unreadParams)

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
