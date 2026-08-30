const express = require('express')
const router = express.Router()
const db = require('../config/db')

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })

// Create utility assistance request
router.post('/request', async (req, res) => {
  try {
    const {
      student_id,
      student_name,
      email,
      phone,
      property_address,
      gas_required,
      electricity_required,
      water_required,
      wifi_required,
      move_in_date,
      additional_notes
    } = req.body

    if (!student_name || !email || !property_address || !move_in_date) {
      return res.status(400).json({
        success: false,
        message: 'Student name, email, property address and move-in date are required.'
      })
    }

    if (
      !gas_required &&
      !electricity_required &&
      !water_required &&
      !wifi_required
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one utility service.'
      })
    }

    const sql = `
      INSERT INTO utility_assistance_requests
      (
        student_id,
        student_name,
        email,
        phone,
        property_address,
        gas_required,
        electricity_required,
        water_required,
        wifi_required,
        move_in_date,
        additional_notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await query(sql, [
      student_id || null,
      student_name,
      email,
      phone || null,
      property_address,
      gas_required ? 1 : 0,
      electricity_required ? 1 : 0,
      water_required ? 1 : 0,
      wifi_required ? 1 : 0,
      move_in_date,
      additional_notes || null
    ])

    res.status(201).json({
      success: true,
      message: 'Utility assistance request submitted successfully.',
      requestId: result.insertId
    })
  } catch (err) {
    console.error('Utility assistance request error:', err)

    res.status(500).json({
      success: false,
      message: 'Failed to submit utility assistance request.'
    })
  }
})

module.exports = router