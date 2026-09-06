const express = require('express')
const router = express.Router()
const db = require('../config/db')

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

async function requireStudent(userId) {
  const rows = await query('SELECT id, role FROM users WHERE id = ?', [userId])
  if (rows.length === 0) return { ok: false, status: 404, message: 'User not found' }
  if (rows[0].role !== 'student') return { ok: false, status: 403, message: 'Only students can subscribe to meal plans' }
  return { ok: true }
}

// GET /api/meals/plans — browse active meal plans
router.get('/plans', async (req, res) => {
  const { search, area, district, meal_type, max_price } = req.query

  let sql = `
    SELECT
      mp.id, mp.name, mp.meal_type, mp.meals_per_day,
      CAST(mp.price_monthly AS DECIMAL(10,2)) AS price_monthly,
      CAST(mp.price_weekly AS DECIMAL(10,2)) AS price_weekly,
      mp.delivery_type, mp.cuisine_tags, mp.serving_areas,
      mp.menu_sample, mp.min_commitment,
      p.id AS provider_id, p.name AS provider_name,
      p.area AS provider_area, p.district AS provider_district,
      p.is_verified AS provider_verified,
      CAST(p.rating_avg AS DECIMAL(3,2)) AS provider_rating
    FROM meal_plans mp
    JOIN meal_providers p ON p.id = mp.provider_id
    WHERE mp.status = 'active' AND p.status = 'active'`

  const params = []

  if (search) {
    sql += ` AND (mp.name LIKE ? OR p.name LIKE ? OR mp.menu_sample LIKE ?)`
    const like = `%${search}%`
    params.push(like, like, like)
  }
  if (area) {
    sql += ` AND (p.area = ? OR mp.serving_areas LIKE ?)`
    params.push(area, `%${area}%`)
  }
  if (district) {
    sql += ` AND p.district = ?`
    params.push(district)
  }
  if (meal_type) {
    sql += ` AND mp.meal_type = ?`
    params.push(meal_type)
  }
  if (max_price) {
    sql += ` AND (mp.price_monthly IS NULL OR mp.price_monthly <= ?)`
    params.push(Number(max_price))
  }

  sql += ` ORDER BY mp.price_monthly ASC, mp.name ASC`

  try {
    const rows = await query(sql, params)
    res.json({ success: true, data: rows, total: rows.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /api/meals/plans/:id — plan detail
router.get('/plans/:id', async (req, res) => {
  const { id } = req.params
  try {
    const rows = await query(
      `SELECT
        mp.id, mp.name, mp.meal_type, mp.meals_per_day,
        CAST(mp.price_monthly AS DECIMAL(10,2)) AS price_monthly,
        CAST(mp.price_weekly AS DECIMAL(10,2)) AS price_weekly,
        mp.delivery_type, mp.cuisine_tags, mp.serving_areas,
        mp.menu_sample, mp.min_commitment,
        p.id AS provider_id, p.name AS provider_name,
        p.contact_phone AS provider_phone,
        p.contact_email AS provider_email,
        p.area AS provider_area, p.district AS provider_district,
        p.description AS provider_description,
        p.is_verified AS provider_verified,
        CAST(p.rating_avg AS DECIMAL(3,2)) AS provider_rating
      FROM meal_plans mp
      JOIN meal_providers p ON p.id = mp.provider_id
      WHERE mp.id = ? AND mp.status = 'active' AND p.status = 'active'`,
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meal plan not found' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /api/meals/subscriptions?user_id=
router.get('/subscriptions', async (req, res) => {
  const userId = Number(req.query.user_id)
  if (!userId) {
    return res.status(400).json({ success: false, message: 'user_id is required' })
  }

  try {
    const rows = await query(
      `SELECT
        ms.id, ms.status, ms.start_date, ms.end_date,
        ms.delivery_address, ms.special_notes, ms.payment_method,
        ms.created_at, ms.updated_at,
        mp.id AS plan_id, mp.name AS plan_name, mp.meal_type,
        CAST(mp.price_monthly AS DECIMAL(10,2)) AS price_monthly,
        CAST(mp.price_weekly AS DECIMAL(10,2)) AS price_weekly,
        mp.delivery_type, mp.min_commitment,
        p.id AS provider_id, p.name AS provider_name,
        p.contact_phone AS provider_phone, p.area AS provider_area
      FROM meal_subscriptions ms
      JOIN meal_plans mp ON mp.id = ms.plan_id
      JOIN meal_providers p ON p.id = mp.provider_id
      WHERE ms.user_id = ?
      ORDER BY ms.created_at DESC`,
      [userId]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST /api/meals/subscriptions — subscribe to a plan
router.post('/subscriptions', async (req, res) => {
  const {
    user_id,
    plan_id,
    start_date,
    delivery_address,
    special_notes,
    payment_method = 'bkash',
  } = req.body

  if (!user_id || !plan_id || !start_date) {
    return res.status(400).json({
      success: false,
      message: 'user_id, plan_id, and start_date are required',
    })
  }

  const studentCheck = await requireStudent(user_id)
  if (!studentCheck.ok) {
    return res.status(studentCheck.status).json({ success: false, message: studentCheck.message })
  }

  try {
    const plans = await query(
      `SELECT mp.id
       FROM meal_plans mp
       JOIN meal_providers p ON p.id = mp.provider_id
       WHERE mp.id = ? AND mp.status = 'active' AND p.status = 'active'`,
      [plan_id]
    )
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Meal plan not found' })
    }

    const existing = await query(
      `SELECT id FROM meal_subscriptions
       WHERE user_id = ? AND plan_id = ? AND status IN ('pending', 'active')`,
      [user_id, plan_id]
    )
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active subscription for this plan',
      })
    }

    const result = await query(
      `INSERT INTO meal_subscriptions
        (plan_id, user_id, status, start_date, delivery_address, special_notes, payment_method)
       VALUES (?, ?, 'active', ?, ?, ?, ?)`,
      [plan_id, user_id, start_date, delivery_address || null, special_notes || null, payment_method]
    )

    const rows = await query(
      `SELECT
        ms.id, ms.status, ms.start_date, ms.delivery_address, ms.special_notes, ms.payment_method,
        mp.name AS plan_name,
        p.name AS provider_name
      FROM meal_subscriptions ms
      JOIN meal_plans mp ON mp.id = ms.plan_id
      JOIN meal_providers p ON p.id = mp.provider_id
      WHERE ms.id = ?`,
      [result.insertId]
    )

    res.json({ success: true, data: rows[0], message: 'Subscription created successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PATCH /api/meals/subscriptions/:id — cancel or pause
router.patch('/subscriptions/:id', async (req, res) => {
  const { id } = req.params
  const { user_id, status } = req.body

  if (!user_id || !status) {
    return res.status(400).json({ success: false, message: 'user_id and status are required' })
  }
  if (!['paused', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be paused or cancelled' })
  }

  try {
    const rows = await query('SELECT id, user_id FROM meal_subscriptions WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' })
    }
    if (rows[0].user_id !== Number(user_id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' })
    }

    await query(
      `UPDATE meal_subscriptions
       SET status = ?, end_date = IF(? = 'cancelled', CURDATE(), end_date)
       WHERE id = ?`,
      [status, status, id]
    )

    res.json({ success: true, message: `Subscription ${status}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router
