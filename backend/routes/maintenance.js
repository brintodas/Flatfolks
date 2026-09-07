/**
 * routes/maintenance.js
 * Service & Maintenance Booking API for Shared Apartments
 * Mounted at: /api/maintenance
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const { MIN_ADVANCE_FEE } = require('../config/pricing')

// Helper for database queries
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// A service with no priced estimated_cost (or ৳0) still needs a payable
// advance amount — fall back to the flat minimum fee instead of ৳0.
const withCostFloor = (cost) => (Number(cost) > 0 ? Number(cost) : MIN_ADVANCE_FEE)

// Same floor, applied to a whole result set's estimated_cost column.
const applyCostFloor = (rows) =>
  rows.map((r) => ({ ...r, estimated_cost: withCostFloor(r.estimated_cost) }))

const VALID_TIME_SLOTS = [
  'জোহরের আগে',
  'জোহরের পরে',
  'আসরের আগে',
  'আসরের পরে',
  'মাগরিবের আগে',
  'মাগরিবের পরে',
  'এশার আগে',
  'এশার পরে',
]

// ─── 1. GET /api/maintenance/catalog ─────────────────────────────────────────
router.get('/catalog', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM service_categories ORDER BY id ASC')
    const services = await query('SELECT * FROM services ORDER BY category_id ASC, id ASC')

    const catalog = categories.map((cat) => ({
      ...cat,
      services: services.filter((s) => s.category_id === cat.id),
    }))

    res.json({ success: true, data: catalog })
  } catch (err) {
    console.error('Error fetching catalog:', err)
    res.status(500).json({ success: false, message: 'Failed to load services catalog' })
  }
})

// ─── 2. GET /api/maintenance/technicians ─────────────────────────────────────
router.get('/technicians', async (req, res) => {
  const { area, category_id } = req.query

  if (!area || !category_id) {
    return res.status(400).json({
      success: false,
      message: 'Both area and category_id parameters are required.',
    })
  }

  try {
    const sql = `
      SELECT 
        t.id,
        t.name,
        t.phone,
        t.area,
        CAST(t.rating AS DECIMAL(2,1)) AS rating,
        c.name AS category_name,
        c.icon AS category_icon
      FROM technicians t
      JOIN service_categories c ON t.service_category_id = c.id
      WHERE LOWER(t.area) = LOWER(?) 
        AND t.service_category_id = ? 
        AND t.is_available = 1
      ORDER BY t.rating DESC
    `
    let technicians = await query(sql, [area.trim(), category_id])

    // Fallback if no exact area match in DB (ensures search always shows technicians)
    if (technicians.length === 0) {
      const fallbackSql = `
        SELECT 
          t.id,
          t.name,
          t.phone,
          ? AS area,
          CAST(t.rating AS DECIMAL(2,1)) AS rating,
          c.name AS category_name,
          c.icon AS category_icon
        FROM technicians t
        JOIN service_categories c ON t.service_category_id = c.id
        WHERE t.service_category_id = ? 
          AND t.is_available = 1
        ORDER BY t.rating DESC
        LIMIT 4
      `
      technicians = await query(fallbackSql, [area.trim(), category_id])
    }

    res.json({ success: true, data: technicians })
  } catch (err) {
    console.error('Error fetching technicians:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch available technicians' })
  }
})

// ─── 3. POST /api/maintenance/bookings ───────────────────────────────────────
router.post('/bookings', async (req, res) => {
  let {
    apartment_id,
    user_id,
    service_id,
    technician_id,
    scheduled_date,
    time_slot,
    problem_description,
  } = req.body

  if (!user_id) {
    return res.status(401).json({
      success: false,
      message: 'Please sign in to book maintenance services.',
    })
  }

  if (!service_id || !technician_id || !scheduled_date || !time_slot) {
    return res.status(400).json({
      success: false,
      message: 'service_id, technician_id, scheduled_date, and time_slot are required.',
    })
  }

  if (!VALID_TIME_SLOTS.includes(time_slot)) {
    return res.status(422).json({
      success: false,
      message: 'Invalid prayer-time slot selected.',
    })
  }

  try {
    // Check if user belongs to a registered flat / roommate group or has an active tenancy
    let hasFlat = false
    const memberGroup = await query(
      `SELECT rgm.group_id FROM roommate_group_members rgm 
       JOIN roommate_groups rg ON rg.id = rgm.group_id 
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING', 'ACTIVE') LIMIT 1`,
      [user_id]
    )

    if (memberGroup.length > 0) {
      apartment_id = memberGroup[0].group_id
      hasFlat = true
    } else {
      // Check for active lease
      const tenancy = await query(
        `SELECT id FROM tenancies WHERE tenant_user_id = ? AND status = 'active' LIMIT 1`,
        [user_id]
      ).catch(() => [])

      if (tenancy && tenancy.length > 0) {
        apartment_id = tenancy[0].id
        hasFlat = true
      }
    }

    if (!hasFlat) {
      return res.status(403).json({
        success: false,
        message: 'You must have a registered living place or flat to book maintenance services. Please join a flat or form a roommate group.',
      })
    }

    const sql = `
      INSERT INTO service_requests (
        apartment_id,
        requested_by_user_id,
        service_id,
        technician_id,
        scheduled_date,
        time_slot,
        problem_description,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT')
    `
    const result = await query(sql, [
      apartment_id || 1,
      user_id || 1,
      service_id,
      technician_id,
      scheduled_date,
      time_slot,
      problem_description || null,
    ])

    const serviceRows = await query('SELECT estimated_cost, name FROM services WHERE id = ?', [service_id])
    const service = serviceRows[0] || {}
    const bookingCost = withCostFloor(service.estimated_cost)

    res.status(201).json({
      success: true,
      booking_id: result.insertId,
      estimated_cost: bookingCost,
      service_name: service.name,
      message: 'Booking created. Please complete payment to confirm.',
    })
  } catch (err) {
    console.error('Error saving booking:', err)
    res.status(500).json({ success: false, message: 'Could not complete booking' })
  }
})

// ─── 4. Helper function for fetching logs with home / roommate isolation ────
// Only CONFIRMED (and later IN_PROGRESS / DONE / CANCELLED) bookings show up
// here — a booking still sitting in PENDING_PAYMENT hasn't actually been
// "booked" yet from the flat's point of view, so it's deliberately excluded.
// It still shows up for the person who created it under Due Payments until
// they either pay (→ CONFIRMED, appears here) or cancel it from there.
async function getLogsForUserOrApartment(userId, apartmentId) {
  const baseSql = `
    SELECT 
      sr.id,
      sr.apartment_id,
      sr.requested_by_user_id,
      sr.scheduled_date,
      sr.time_slot,
      sr.problem_description,
      sr.status,
      sr.created_at,
      s.name AS service_name,
      s.estimated_cost AS estimated_cost,
      c.name AS category_name,
      t.name AS technician_name,
      t.phone AS technician_phone,
      u.full_name AS requested_by_name,
      u.email AS requested_by_email
    FROM service_requests sr
    JOIN services s ON sr.service_id = s.id
    JOIN service_categories c ON s.category_id = c.id
    JOIN technicians t ON sr.technician_id = t.id
    LEFT JOIN users u ON sr.requested_by_user_id = u.id
  `

  if (userId) {
    // Check if user lives with roommates in a group
    const groupRows = await query(
      `SELECT rgm.group_id, rgm2.user_id AS flatmate_id
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       JOIN roommate_group_members rgm2 ON rgm2.group_id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING', 'ACTIVE')`,
      [userId]
    )

    if (groupRows.length > 0) {
      const flatmateIds = [...new Set(groupRows.map((r) => r.flatmate_id))]
      const groupId = groupRows[0].group_id
      const sql = `${baseSql} WHERE (sr.requested_by_user_id IN (?) OR sr.apartment_id = ?) AND sr.status != 'PENDING_PAYMENT' ORDER BY sr.id DESC`
      const rows = await query(sql, [flatmateIds, groupId])
      return applyCostFloor(rows)
    } else {
      // User is not in a roommate group -> only sees their own bookings
      const sql = `${baseSql} WHERE sr.requested_by_user_id = ? AND sr.status != 'PENDING_PAYMENT' ORDER BY sr.id DESC`
      const rows = await query(sql, [userId])
      return applyCostFloor(rows)
    }
  }

  if (apartmentId && apartmentId !== 'undefined' && apartmentId !== 'null') {
    const sql = `${baseSql} WHERE sr.apartment_id = ? AND sr.status != 'PENDING_PAYMENT' ORDER BY sr.id DESC`
    const rows = await query(sql, [apartmentId])
    return applyCostFloor(rows)
  }

  return []
}

// ─── 5. GET /api/maintenance/logs (Supports ?user_id=... & ?apartment_id=...) 
router.get('/logs', async (req, res) => {
  const userId = req.query.user_id || req.query.userId
  const apartmentId = req.query.apartment_id || req.query.apartmentId

  try {
    const logs = await getLogsForUserOrApartment(userId, apartmentId)
    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('Error fetching maintenance logs:', err)
    res.status(500).json({ success: false, message: 'Could not fetch logs' })
  }
})

// ─── 6. GET /api/maintenance/logs/:apartmentId ──────────────────────────────
router.get('/logs/:apartmentId', async (req, res) => {
  const { apartmentId } = req.params
  const userId = req.query.user_id || req.query.userId

  try {
    const logs = await getLogsForUserOrApartment(userId, apartmentId)
    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('Error fetching maintenance log:', err)
    res.status(500).json({ success: false, message: 'Could not fetch apartment logs' })
  }
})

// ─── 7. DELETE /api/maintenance/bookings/:id ────────────────────────────────
router.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params
  const userId = req.query.user_id || req.body?.user_id

  try {
    const existing = await query('SELECT * FROM service_requests WHERE id = ?', [id])
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' })
    }

    const booking = existing[0]

    // Authorization: User can delete if they requested it, or if they live in the same roommate group
    if (userId) {
      let isAuthorized = String(booking.requested_by_user_id) === String(userId)

      if (!isAuthorized) {
        const groupMatch = await query(
          `SELECT 1 FROM roommate_group_members rgm1
           JOIN roommate_group_members rgm2 ON rgm1.group_id = rgm2.group_id
           WHERE rgm1.user_id = ? AND (rgm2.user_id = ? OR rgm1.group_id = ?)`,
          [userId, booking.requested_by_user_id, booking.apartment_id]
        )
        if (groupMatch.length > 0) {
          isAuthorized = true
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete this maintenance booking.',
        })
      }
    }

    await query('DELETE FROM service_requests WHERE id = ?', [id])

    res.json({
      success: true,
      message: 'Maintenance booking deleted successfully.',
    })
  } catch (err) {
    console.error('Error deleting maintenance booking:', err)
    res.status(500).json({ success: false, message: 'Failed to delete booking.' })
  }
})

// Also mount DELETE /logs/:id alias
router.delete('/logs/:id', async (req, res) => {
  req.url = `/bookings/${req.params.id}`
  router.handle(req, res)
})

// ─── 8. POST /api/maintenance/register-living-space ─────────────────────────
router.post('/register-living-space', async (req, res) => {
  const {
    user_id,
    apartment_name,
    address,
    area,
    monthly_rent,
    bedrooms,
    bathrooms,
    kitchens = 1,
    size_sqft,
    contact_phone,
  } = req.body

  if (!user_id || !address || !area || !monthly_rent) {
    return res.status(400).json({
      success: false,
      message: 'user_id, address, area, and monthly_rent are required.',
    })
  }

  try {
    const userRows = await query('SELECT id, full_name, phone FROM users WHERE id = ?', [user_id])
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    // Update user contact phone if provided
    if (contact_phone) {
      await query('UPDATE users SET phone = ? WHERE id = ?', [contact_phone, user_id])
    }

    const flatName = apartment_name?.trim() || `${area} Flat (${address})`

    // Check if user already has a group membership
    const existingMember = await query(
      `SELECT rgm.group_id FROM roommate_group_members rgm 
       JOIN roommate_groups rg ON rg.id = rgm.group_id 
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING', 'ACTIVE') LIMIT 1`,
      [user_id]
    )

    let groupId
    if (existingMember.length > 0) {
      groupId = existingMember[0].group_id
      await query(
        `UPDATE roommate_groups 
         SET name = ?, address = ?, area = ?, monthly_rent = ?, bedrooms = ?, bathrooms = ?, kitchens = ?, size_sqft = ?, contact_phone = ?, status = 'ACTIVE' 
         WHERE id = ?`,
        [flatName, address, area, monthly_rent, bedrooms || 1, bathrooms || 1, kitchens || 1, size_sqft || null, contact_phone || null, groupId]
      )
    } else {
      const groupRes = await query(
        `INSERT INTO roommate_groups (leader_id, name, status, address, area, monthly_rent, bedrooms, bathrooms, kitchens, size_sqft, contact_phone) 
         VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, flatName, address, area, monthly_rent, bedrooms || 1, bathrooms || 1, kitchens || 1, size_sqft || null, contact_phone || null]
      )
      groupId = groupRes.insertId

      await query(
        `INSERT INTO roommate_group_members (group_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE group_id = VALUES(group_id)`,
        [groupId, user_id]
      )
    }

    const [groupData] = await query('SELECT * FROM roommate_groups WHERE id = ?', [groupId])

    res.status(201).json({
      success: true,
      message: 'Living space registered successfully! You can now book technicians and maintenance services.',
      group: groupData,
    })
  } catch (err) {
    console.error('Error registering living space:', err)
    res.status(500).json({ success: false, message: 'Failed to register living space.' })
  }
})

module.exports = router