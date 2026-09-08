const express = require('express')
const router = express.Router()
const db = require('../config/db')
const { MIN_ADVANCE_FEE } = require('../config/pricing')

// A plan with no priced monthly/weekly rate yet still needs a payable amount
// to send to the payment gateway — same floor pattern as maintenance.js.
const planAmount = (plan) => {
  if (Number(plan.price_monthly) > 0) return Number(plan.price_monthly)
  if (Number(plan.price_weekly) > 0) return Number(plan.price_weekly)
  return MIN_ADVANCE_FEE
}

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

let isInitialized = false

async function ensureTablesAndData() {
  if (isInitialized) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS meal_providers (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(150) NOT NULL,
        contact_phone varchar(20) DEFAULT NULL,
        contact_email varchar(150) DEFAULT NULL,
        area varchar(100) DEFAULT NULL,
        district varchar(100) DEFAULT 'Dhaka',
        description text DEFAULT NULL,
        is_verified tinyint(1) DEFAULT 0,
        rating_avg decimal(3,2) DEFAULT NULL,
        status enum('active','inactive') NOT NULL DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id int(11) NOT NULL AUTO_INCREMENT,
        provider_id int(11) NOT NULL,
        name varchar(150) NOT NULL,
        meal_type enum('breakfast','lunch','dinner','full_board','custom') NOT NULL,
        meals_per_day tinyint(4) DEFAULT 2,
        price_monthly decimal(10,2) DEFAULT NULL,
        price_weekly decimal(10,2) DEFAULT NULL,
        delivery_type enum('pickup','home_delivery','both') NOT NULL DEFAULT 'pickup',
        cuisine_tags varchar(255) DEFAULT NULL,
        serving_areas varchar(500) DEFAULT NULL,
        menu_sample text DEFAULT NULL,
        min_commitment enum('weekly','monthly','semester') NOT NULL DEFAULT 'monthly',
        status enum('active','inactive') NOT NULL DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (id),
        KEY idx_provider (provider_id),
        CONSTRAINT meal_plans_provider_fk FOREIGN KEY (provider_id) REFERENCES meal_providers (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS meal_subscriptions (
        id int(11) NOT NULL AUTO_INCREMENT,
        plan_id int(11) NOT NULL,
        user_id int(11) NOT NULL,
        status enum('pending','active','paused','cancelled','expired') NOT NULL DEFAULT 'pending',
        start_date date NOT NULL,
        end_date date DEFAULT NULL,
        delivery_address varchar(255) DEFAULT NULL,
        special_notes varchar(500) DEFAULT NULL,
        payment_method enum('bkash','nagad','cash','bank','other') NOT NULL DEFAULT 'bkash',
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (id),
        KEY idx_user (user_id),
        KEY idx_plan (plan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `)

    const countRows = await query('SELECT COUNT(*) as count FROM meal_plans')
    if (countRows[0].count === 0) {
      await query(`
        INSERT INTO meal_providers (id, name, contact_phone, contact_email, area, district, description, is_verified, rating_avg, status) VALUES
        (1, 'Badda Student Mess', '01711000001', 'badda.mess@flatfolks.local', 'Badda', 'Dhaka', 'Small mess run by Rahim bhai near Link Road. Mostly BRACU students. Food is simple but filling — nothing fancy, just proper home-style bhaat-dal.', 1, 4.60, 'active'),
        (2, 'Dhanmondi Home Kitchen', '01711000002', 'dhanmondi.kitchen@flatfolks.local', 'Dhanmondi', 'Dhaka', 'Run by Aunty Farida from her flat kitchen. Good if you just moved in and the stove is not set up yet. Lunch boxes only, no dine-in.', 1, 4.50, 'active'),
        (3, 'Uttara Mess Point', '01711000003', 'uttara.mess@flatfolks.local', 'Uttara', 'Dhaka', 'Sector 4 er pasher mess. Breakfast is basic but lunch is solid. A lot of NSU and UIU students eat here.', 1, 4.40, 'active'),
        (4, 'Bashundhara Catering Hub', '01711000004', 'bashundhara.catering@flatfolks.local', 'Bashundhara R/A', 'Dhaka', 'Slightly better quality than average mess — they actually change the menu and don''t repeat chicken curry 5 days straight.', 1, 4.70, 'active'),
        (5, 'Mirpur Student Meals', '01711000005', 'mirpur.meals@flatfolks.local', 'Mirpur', 'Dhaka', 'Cheapest option on the list. Portions are okay, taste is fine for the price. Pickup from Mirpur 10 stand.', 0, 4.30, 'active')
      `)

      await query(`
        INSERT INTO meal_plans (id, provider_id, name, meal_type, meals_per_day, price_monthly, price_weekly, delivery_type, cuisine_tags, serving_areas, menu_sample, min_commitment, status) VALUES
        (1, 1, 'Lunch + Dinner Standard', 'custom', 2, 5500.00, 1500.00, 'pickup', 'bengali,halal', 'Badda,Rampura,Khilgaon', 'Weekly rotation (rough idea):\nMon — bhaat, mug dal, alu bhaji, dim bhuna\nTue — bhaat, dal, begun bharta, chicken curry\nWed — bhaat, dal, shobji, beef (small piece)\nThu — khichuri + dim bhaji + begun fry (dinner)\nFri — bhaat, dal, mixed veg, rui mach\nSat/Sun — same cycle repeats\n\nLunch pickup 12:30, dinner 8:00 from Link Road. Extra rice free if you ask.', 'monthly', 'active'),
        (2, 1, 'Full Board Student Plan', 'full_board', 3, 7500.00, 2100.00, 'both', 'bengali,halal', 'Badda,Rampura', 'Breakfast (8–9am):\nParatha + dim bhuji, or bread + butter. Friday sometimes halim.\n\nLunch:\nNormal bhaat-dal-tarkari. Fish twice a week.\n\nDinner:\nLighter meals — khichuri on Thu, rest days bhaat + dal + bhaji.\n\nNot restaurant quality but you won''t stay hungry. Most guys from Block D eat here.', 'monthly', 'active'),
        (3, 2, 'Lunch Only', 'lunch', 1, 3200.00, 900.00, 'home_delivery', 'bengali,halal,veg-option', 'Dhanmondi,Lalmatia,Mohammadpur', 'Sample week:\nSun — bhaat, dal, potol bhaji, rui macher jhol, achaar\nMon — bhaat, dal, shobji, chicken curry\nTue — bhaat, dal, alu posto, dim er omelette\nWed — bhaat, dal, begun bhaja, beef bhuna\nThu — bhaat, dal, mixed veg, fish fry\nFri — polao, chicken roast, salad\nSat — khichuri, dim bhaji, begun\n\nBox arrives 12:45–1:15. Tell Aunty if you want less oil or no beef.', 'weekly', 'active'),
        (4, 2, 'Dinner Only', 'dinner', 1, 3500.00, 950.00, 'home_delivery', 'bengali,halal', 'Dhanmondi,Lalmatia', 'Evening box (7:30–8:15 delivery):\nSun — bhaat, dal, shobji, fish curry\nMon — khichuri + dim bhaji\nTue — bhaat, dal, chicken, salad\nWed — bhaat, dal, alu bharta, begun fry\nThu — bhaat, dal, mixed veg, dim bhuna\nFri — fried rice + chicken (small treat)\nSat — bhaat, dal, shutki bhuna (optional — skip if you hate shutki)\n\nLeave tiffin outside door. She collects empty boxes next morning.', 'weekly', 'active'),
        (5, 3, 'Breakfast + Lunch', 'custom', 2, 4800.00, 1300.00, 'pickup', 'bengali,halal', 'Uttara,Vatara,Kuril', 'Breakfast (7:45–8:30):\nRoti/paratha + sabzi, or chira-muri on rush days.\n\nLunch (1:00–2:00):\nMon — bhaat, dal, alu dom, egg curry\nTue — bhaat, dal, shobji, chicken\nWed — bhaat, dal, begun, fish\nThu — khichuri + dim\nFri — bhaat, dal, mixed veg, beef\n\nPickup from Sector 4 mess gate. Come early or the good eggs run out.', 'monthly', 'active'),
        (6, 3, 'Full Board Mess', 'full_board', 3, 8200.00, NULL, 'pickup', 'bengali,halal', 'Uttara', 'They post the week''s menu on a whiteboard every Saturday.\n\nTypical week:\nBreakfast — paratha, dim, tea (yes, tea included)\nLunch — bhaat, dal, 2 bhaji, protein (fish/chicken/egg rotating)\nDinner — usually lighter, khichuri 2x/week\n\nFriday lunch is better — sometimes korma if enough subscribers.\nSemester plan gets you a locked seat. No refund if you skip — they''re strict about that.', 'semester', 'active'),
        (7, 4, 'Lunch + Dinner Premium', 'custom', 2, 6800.00, 1850.00, 'both', 'bengali,halal,continental', 'Bashundhara R/A,Kuril,Badda', 'Lunch sample:\nBhaat/roti option, dal, 2 sides, protein (fish/chicken/mutton on Fri), salad, borhani on Fridays.\n\nDinner sample:\nMon — pasta + chicken steak (small)\nTue — bhaat, dal, fish\nWed — fried rice + chilli chicken\nThu — bhaat, dal, shobji, beef\nFri — BBQ chicken + naan\nSat — khichuri or biryani (alternate weeks)\nSun — home-style bhaat-dal-fish\n\nDelivery to Bashundhara blocks. Pickup also available from Jamuna Future Park side.', 'monthly', 'active'),
        (8, 4, 'Weekly Trial Pack', 'custom', 2, NULL, 1700.00, 'home_delivery', 'bengali,halal', 'Bashundhara R/A', '7-day trial menu (what you actually get):\nDay 1 — lunch: bhaat-dal-chicken, dinner: khichuri-dim\nDay 2 — lunch: fish curry, dinner: fried rice-egg\nDay 3 — lunch: beef bhuna, dinner: bhaat-dal-bhaji\nDay 4 — lunch: shobji-egg, dinner: chicken curry\nDay 5 — lunch: polao-chicken, dinner: light khichuri\nDay 6 — lunch: bhaat-dal-fish, dinner: pasta (yes, pasta)\nDay 7 — lunch: biryani small, dinner: soup + bread\n\nGood way to test before monthly. Delivery slot 1pm / 8pm.', 'weekly', 'active'),
        (9, 5, 'Budget Lunch Mess', 'lunch', 1, 2800.00, 800.00, 'pickup', 'bengali,halal', 'Mirpur,Mohakhali', 'Mon — bhaat, dal, alu bhaji, dim\nTue — bhaat, dal, shobji, chicken (small)\nWed — bhaat, dal, begun, fish (if available)\nThu — khichuri, dim\nFri — bhaat, dal, mixed veg, egg curry\n\nSame thing most weeks. Don''t expect variety — you''re paying 2800/month.\nPickup Mirpur 10 er counter, 12:30 sharp. Late = cold food.', 'monthly', 'active'),
        (10, 5, 'Dinner Mess', 'dinner', 1, 3000.00, 850.00, 'pickup', 'bengali,halal', 'Mirpur', 'Dinner only (8:00–8:30 pickup):\nSun/Tue/Thu — bhaat, dal, shobji, chicken or fish\nMon — khichuri + begun bhaja\nWed — bhaat, dal, alu-posto, dim\nFri — fried rice + egg (Friday special)\nSat — bhaat, dal, shutki or shobji\n\nPortions are decent. Bring your own tiffin box if you want — they charge 50 tk less.', 'monthly', 'active')
      `)
    }
    isInitialized = true
  } catch (e) {
    console.error('Auto-init meals tables failed:', e)
  }
}

// GET /api/meals/plans — browse active meal plans
router.get('/plans', async (req, res) => {
  await ensureTablesAndData()
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
  await ensureTablesAndData()
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

// POST /api/meals/subscriptions — start a subscription to a plan.
// Mirrors maintenance.js's booking flow: the row is created as 'pending'
// (not activated yet) and the frontend sends the student to the payment
// gateway. It only becomes 'active' once payments.js confirms the charge —
// see applySuccessfulPayment() in routes/payments.js.
router.post('/subscriptions', async (req, res) => {
  const {
    user_id,
    plan_id,
    start_date,
    delivery_address,
    special_notes,
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
      `SELECT mp.id, mp.name, CAST(mp.price_monthly AS DECIMAL(10,2)) AS price_monthly,
              CAST(mp.price_weekly AS DECIMAL(10,2)) AS price_weekly,
              p.name AS provider_name
       FROM meal_plans mp
       JOIN meal_providers p ON p.id = mp.provider_id
       WHERE mp.id = ? AND mp.status = 'active' AND p.status = 'active'`,
      [plan_id]
    )
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Meal plan not found' })
    }
    const plan = plans[0]

    const existing = await query(
      `SELECT id FROM meal_subscriptions
       WHERE user_id = ? AND plan_id = ? AND status IN ('pending', 'active')`,
      [user_id, plan_id]
    )
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have a subscription for this plan (active, or awaiting payment)',
      })
    }

    const result = await query(
      `INSERT INTO meal_subscriptions
        (plan_id, user_id, status, start_date, delivery_address, special_notes)
       VALUES (?, ?, 'pending', ?, ?, ?)`,
      [plan_id, user_id, start_date, delivery_address || null, special_notes || null]
    )

    res.status(201).json({
      success: true,
      subscription_id: result.insertId,
      amount_due: planAmount(plan),
      plan_name: plan.name,
      provider_name: plan.provider_name,
      message: 'Subscription started. Please complete payment to confirm.',
    })
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