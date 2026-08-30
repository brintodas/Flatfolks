/**
 * routes/maintenance.js
 * Service & Maintenance Booking API for Shared Apartments
 * Mounted at: /api/maintenance
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')

// Helper for database queries
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

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
      WHERE t.area = ? 
        AND t.service_category_id = ? 
        AND t.is_available = 1
      ORDER BY t.rating DESC
    `
    const technicians = await query(sql, [area, category_id])
    res.json({ success: true, data: technicians })
  } catch (err) {
    console.error('Error fetching technicians:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch available technicians' })
  }
})

// ─── 3. POST /api/maintenance/bookings ───────────────────────────────────────
router.post('/bookings', async (req, res) => {
  const {
    apartment_id = 1,
    user_id = 1,
    service_id,
    technician_id,
    scheduled_date,
    time_slot,
    problem_description,
  } = req.body

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
    `
    const result = await query(sql, [
      apartment_id,
      user_id,
      service_id,
      technician_id,
      scheduled_date,
      time_slot,
      problem_description || null,
    ])

    res.status(201).json({
      success: true,
      booking_id: result.insertId,
      message: 'Technician booked successfully. Shared with all flatmates!',
    })
  } catch (err) {
    console.error('Error saving booking:', err)
    res.status(500).json({ success: false, message: 'Could not complete booking' })
  }
})

// ─── 4. GET /api/maintenance/logs/:apartmentId ──────────────────────────────
router.get('/logs/:apartmentId', async (req, res) => {
  const { apartmentId } = req.params

  try {
    const sql = `
      SELECT 
        sr.id,
        sr.apartment_id,
        sr.scheduled_date,
        sr.time_slot,
        sr.problem_description,
        sr.status,
        sr.created_at,
        s.name AS service_name,
        c.name AS category_name,
        t.name AS technician_name,
        t.phone AS technician_phone,
        u.full_name AS requested_by_name
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN service_categories c ON s.category_id = c.id
      JOIN technicians t ON sr.technician_id = t.id
      LEFT JOIN users u ON sr.requested_by_user_id = u.id
      WHERE sr.apartment_id = ?
      ORDER BY sr.id DESC
    `
    const logs = await query(sql, [apartmentId])
    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('Error fetching maintenance log:', err)
    res.status(500).json({ success: false, message: 'Could not fetch apartment logs' })
  }
})

module.exports = router
