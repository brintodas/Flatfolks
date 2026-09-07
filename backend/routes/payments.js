/**
 * routes/payments.js
 * Centralized Payment Gateway — FlatFolks
 * Mounted at: /api/payments
 *
 * Flows:
 *  1. POST /initiate      → creates PENDING row, asks SSLCommerz for checkout URL
 *  2. SSLCommerz callbacks → /success, /fail, /cancel, /ipn
 *  3. POST /direct-confirm → dev/demo mode: confirms payment locally without SSLCommerz
 *  4. GET  /due/:userId   → list of pending payments (advance + unpaid maintenance)
 *  5. GET  /history/:userId → completed payment history
 *  6. GET  /:id/status    → status of a single payment
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const sslcz = require('../config/sslcommerz')
const { MIN_ADVANCE_FEE } = require('../config/pricing')

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// SSLCommerz posts these callbacks as classic form submissions, not JSON
router.use(express.urlencoded({ extended: true }))

const VALID_SERVICE_TYPES = ['rent', 'advance_payment', 'maintenance', 'utility_assistance', 'shared_bill', 'other']

function makeTranId(serviceType) {
  return `FF-${serviceType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Notification helper ──────────────────────────────────────────────────────
async function createNotification({ user_id, type, title, message, related_type = 'payment', related_id = null }) {
  if (!user_id) return
  await query(
    `INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, type, title, message || null, related_type, related_id]
  )
}

// ─── Side effects after a successful payment ──────────────────────────────────
async function applySuccessfulPayment(payment) {
  // ── Advance deposit (application approval flow) ──────────────────────────
  if (payment.service_type === 'advance_payment') {
    const already = await query(`SELECT id FROM rent_payments WHERE payment_id = ? LIMIT 1`, [payment.id])
    if (already.length > 0) return // idempotency guard

    const tenancies = await query(
      `SELECT t.*, l.title AS listing_title FROM tenancies t
       JOIN listings l ON l.id = t.listing_id WHERE t.id = ?`,
      [payment.reference_id]
    )
    const tenancy = tenancies[0]
    if (!tenancy) return

    // Activate the tenancy
    await query(`UPDATE tenancies SET status = 'active' WHERE id = ?`, [tenancy.id])

    // Mark the listing as inactive (unit now occupied)
    await query(`UPDATE listings SET status = 'inactive' WHERE id = ?`, [tenancy.listing_id])

    // Record the advance in rent_payments so it shows on the revenue graph
    const paymentMonth = new Date().toISOString().slice(0, 7) + '-01'
    await query(
      `INSERT INTO rent_payments (tenancy_id, landlord_id, amount, payment_id, payment_method, payment_month)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenancy.id, tenancy.landlord_id, payment.amount, payment.id, payment.payment_method || 'unknown', paymentMonth]
    )

    await query(`UPDATE payments SET payee_id = ? WHERE id = ?`, [tenancy.landlord_id, payment.id])

    // Notify the landlord that advance payment was received and unit is now occupied
    await createNotification({
      user_id: tenancy.landlord_id,
      type: 'payment_received',
      title: 'Advance Payment Received — Unit Occupied',
      message: `${tenancy.tenant_name} paid the advance deposit of ৳${Number(payment.amount).toLocaleString()} for "${tenancy.listing_title}". The unit is now marked as occupied.`,
      related_type: 'tenancy',
      related_id: tenancy.id,
    })

    // Notify the student that tenancy is confirmed
    await createNotification({
      user_id: tenancy.tenant_user_id,
      type: 'payment_sent',
      title: 'Tenancy Confirmed!',
      message: `Your advance payment for "${tenancy.listing_title}" was successful. Your tenancy is now active!`,
      related_type: 'tenancy',
      related_id: tenancy.id,
    })
    return
  }

  // ── Monthly rent ─────────────────────────────────────────────────────────
  if (payment.service_type === 'rent') {
    const already = await query(`SELECT id FROM rent_payments WHERE payment_id = ? LIMIT 1`, [payment.id])
    if (already.length > 0) return

    const tenancies = await query(
      `SELECT t.*, l.title AS listing_title FROM tenancies t
       JOIN listings l ON l.id = t.listing_id WHERE t.id = ?`,
      [payment.reference_id]
    )
    const tenancy = tenancies[0]
    if (!tenancy) return

    const paymentMonth = new Date().toISOString().slice(0, 7) + '-01'

    await query(
      `INSERT INTO rent_payments (tenancy_id, landlord_id, amount, payment_id, payment_method, payment_month)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenancy.id, tenancy.landlord_id, payment.amount, payment.id, payment.payment_method || 'unknown', paymentMonth]
    )

    await query(`UPDATE payments SET payee_id = ? WHERE id = ?`, [tenancy.landlord_id, payment.id])

    await createNotification({
      user_id: tenancy.landlord_id,
      type: 'payment_received',
      title: 'Rent payment received',
      message: `${tenancy.tenant_name} paid ৳${Number(payment.amount).toLocaleString()} for ${tenancy.listing_title}.`,
      related_type: 'rent_payment',
      related_id: payment.id,
    })
    return
  }

  // ── Maintenance booking ───────────────────────────────────────────────────
  if (payment.service_type === 'maintenance') {
    await query(`UPDATE service_requests SET status = 'CONFIRMED' WHERE id = ?`, [payment.reference_id])

    // Notify student that their booking is confirmed
    if (payment.payer_id) {
      const svcRows = await query(
        `SELECT sr.id, s.name AS service_name FROM service_requests sr
         JOIN services s ON s.id = sr.service_id WHERE sr.id = ?`,
        [payment.reference_id]
      )
      const svc = svcRows[0]
      if (svc) {
        await createNotification({
          user_id: payment.payer_id,
          type: 'payment_sent',
          title: 'Maintenance Booking Confirmed',
          message: `Your payment for "${svc.service_name}" has been received. The technician will contact you soon.`,
          related_type: 'maintenance',
          related_id: payment.reference_id,
        })
      }
    }
    return
  }

  if (payment.service_type === 'utility_assistance') {
    await query(`UPDATE utility_assistance_requests SET status = 'IN_PROGRESS' WHERE id = ?`, [
      payment.reference_id,
    ])
    return
  }
}

// ─── 1. POST /api/payments/initiate ──────────────────────────────────────────
router.post('/initiate', async (req, res) => {
  const {
    payer_id,
    service_type,
    reference_id,
    amount,
    description,
    payer_name,
    payer_email,
    payer_phone,
  } = req.body

  if (!service_type || !VALID_SERVICE_TYPES.includes(service_type)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing service_type' })
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'A valid amount is required' })
  }
  if (!payer_name || !payer_email || !payer_phone) {
    return res.status(400).json({ success: false, message: 'payer_name, payer_email and payer_phone are required' })
  }

  const tranId = makeTranId(service_type)

  try {
    const result = await query(
      `INSERT INTO payments
        (payer_id, service_type, reference_id, amount, tran_id, status, payer_name, payer_email, payer_phone, description)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
      [payer_id || null, service_type, reference_id || null, amount, tranId, payer_name, payer_email, payer_phone, description || null]
    )
    const paymentId = result.insertId

    const gatewayParams = new URLSearchParams({
      store_id: sslcz.storeId,
      store_passwd: sslcz.storePasswd,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `http://localhost:8000/api/payments/success`,
      fail_url: `http://localhost:8000/api/payments/fail`,
      cancel_url: `http://localhost:8000/api/payments/cancel`,
      ipn_url: `http://localhost:8000/api/payments/ipn`,
      shipping_method: 'NO',
      product_name: description || service_type,
      product_category: service_type,
      product_profile: 'general',
      cus_name: payer_name,
      cus_email: payer_email,
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: payer_phone,
      value_a: String(paymentId),
      value_b: service_type,
      value_c: reference_id ? String(reference_id) : '',
      value_d: payer_id ? String(payer_id) : '',
    })

    const isLive = sslcz.isLive
    const apiBase = isLive
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com'

    try {
      const sslRes = await fetch(`${apiBase}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: gatewayParams,
      })
      const sslData = await sslRes.json()

      if (sslData.status !== 'SUCCESS' || !sslData.GatewayPageURL) {
        // Gateway not configured — return the payment_id so frontend can use direct-confirm
        return res.json({
          success: true,
          payment_id: paymentId,
          tran_id: tranId,
          gateway_url: null,
          use_direct: true,
          message: 'Gateway not configured. Use direct-confirm endpoint.',
        })
      }

      res.json({
        success: true,
        payment_id: paymentId,
        tran_id: tranId,
        gateway_url: sslData.GatewayPageURL,
        use_direct: false,
      })
    } catch (_gatewayErr) {
      // SSLCommerz unreachable — return payment_id for direct confirm
      res.json({
        success: true,
        payment_id: paymentId,
        tran_id: tranId,
        gateway_url: null,
        use_direct: true,
        message: 'Gateway unavailable. Use direct-confirm endpoint.',
      })
    }
  } catch (err) {
    console.error('Payment initiate error:', err)
    res.status(500).json({ success: false, message: 'Could not start payment' })
  }
})

// ─── 2. POST /api/payments/direct-confirm ────────────────────────────────────
// Dev/demo endpoint — confirms a payment directly without SSLCommerz.
// Body: { payment_id, payment_method }
router.post('/direct-confirm', async (req, res) => {
  const { payment_id, payment_method } = req.body
  if (!payment_id) {
    return res.status(400).json({ success: false, message: 'payment_id is required' })
  }
  try {
    const rows = await query(`SELECT * FROM payments WHERE id = ?`, [payment_id])
    const payment = rows[0]
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
    if (payment.status === 'SUCCESS') {
      return res.json({ success: true, message: 'Already confirmed', payment_id: payment.id })
    }

    const resolvedMethod = payment_method || 'direct'
    await query(
      `UPDATE payments SET status = 'SUCCESS', payment_method = ? WHERE id = ?`,
      [resolvedMethod, payment.id]
    )

    await applySuccessfulPayment({ ...payment, status: 'SUCCESS', payment_method: resolvedMethod })

    res.json({ success: true, message: 'Payment confirmed', payment_id: payment.id })
  } catch (err) {
    console.error('Direct confirm error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// ─── 3. GET /api/payments/due/:userId ────────────────────────────────────────
// Returns all pending payment items for a student:
//   - Advance deposits on approved-but-unpaid tenancies
//   - Maintenance bookings in PENDING_PAYMENT status
router.get('/due/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const dues = []

    // Pending advance payments
    const tenancies = await query(
      `SELECT t.id, t.rent_amount, t.listing_id, l.title AS listing_title
       FROM tenancies t
       JOIN listings l ON l.id = t.listing_id
       WHERE t.tenant_user_id = ? AND t.status = 'pending_payment'`,
      [userId]
    )
    for (const t of tenancies) {
      dues.push({
        id: `advance_${t.id}`,
        type: 'advance_payment',
        service_type: 'advance_payment',
        reference_id: t.id,
        description: `Advance Payment — ${t.listing_title}`,
        amount: t.rent_amount,
      })
    }

    // Unpaid maintenance bookings
    const maintenances = await query(
      `SELECT sr.id, s.estimated_cost AS amount, s.name AS service_name,
              c.name AS category_name
       FROM service_requests sr
       JOIN services s ON s.id = sr.service_id
       JOIN service_categories c ON c.id = s.category_id
       WHERE sr.requested_by_user_id = ? AND sr.status = 'PENDING_PAYMENT'`,
      [userId]
    )
    for (const m of maintenances) {
      // Some services don't have a fixed estimated_cost set yet — floor it
      // to the minimum advance fee instead of showing/charging ৳0.
      const amount = Number(m.amount) > 0 ? Number(m.amount) : MIN_ADVANCE_FEE
      dues.push({
        id: `maintenance_${m.id}`,
        type: 'maintenance',
        service_type: 'maintenance',
        reference_id: m.id,
        description: `${m.category_name} — ${m.service_name}`,
        amount,
      })
    }

    res.json({ success: true, data: dues })
  } catch (err) {
    console.error('Due payments error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// ─── 4. Gateway callbacks (browser redirects) ─────────────────────────────────
async function validateWithGateway(val_id) {
  const isLive = sslcz.isLive
  const apiBase = isLive
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com'
  const params = new URLSearchParams({
    val_id,
    store_id: sslcz.storeId,
    store_passwd: sslcz.storePasswd,
    format: 'json',
  })
  const r = await fetch(`${apiBase}/validator/api/validationserverAPI.php?${params.toString()}`)
  return r.json()
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

router.post('/success', async (req, res) => {
  const { tran_id, val_id, amount } = req.body
  try {
    const rows = await query(`SELECT * FROM payments WHERE tran_id = ?`, [tran_id])
    const payment = rows[0]
    if (!payment) return res.redirect(`${FRONTEND_URL}/payment/result?status=fail&reason=not_found`)

    if (payment.status === 'SUCCESS') {
      return res.redirect(`${FRONTEND_URL}/payment/result?status=success&payment_id=${payment.id}`)
    }

    const validation = await validateWithGateway(val_id)
    const isValid =
      ['VALID', 'VALIDATED'].includes(validation.status) &&
      Number(validation.amount).toFixed(2) === Number(payment.amount).toFixed(2)

    if (!isValid) {
      await query(`UPDATE payments SET status = 'FAILED', gateway_response = ? WHERE id = ?`, [
        JSON.stringify(validation),
        payment.id,
      ])
      return res.redirect(`${FRONTEND_URL}/payment/result?status=fail&payment_id=${payment.id}`)
    }

    const resolvedMethod = validation.card_type || validation.card_issuer || 'unknown'
    await query(
      `UPDATE payments SET status = 'SUCCESS', val_id = ?, payment_method = ?, gateway_response = ? WHERE id = ?`,
      [val_id, resolvedMethod, JSON.stringify(validation), payment.id]
    )

    await applySuccessfulPayment({ ...payment, status: 'SUCCESS', payment_method: resolvedMethod })

    res.redirect(`${FRONTEND_URL}/payment/result?status=success&payment_id=${payment.id}`)
  } catch (err) {
    console.error('Payment success-callback error:', err)
    res.redirect(`${FRONTEND_URL}/payment/result?status=fail&reason=server_error`)
  }
})

router.post('/fail', async (req, res) => {
  const { tran_id } = req.body
  try {
    const rows = await query(`SELECT * FROM payments WHERE tran_id = ?`, [tran_id])
    const payment = rows[0]
    if (payment && payment.status === 'PENDING') {
      await query(`UPDATE payments SET status = 'FAILED' WHERE id = ?`, [payment.id])
    }
    res.redirect(`${FRONTEND_URL}/payment/result?status=fail&payment_id=${payment ? payment.id : ''}`)
  } catch (err) {
    console.error('Payment fail-callback error:', err)
    res.redirect(`${FRONTEND_URL}/payment/result?status=fail`)
  }
})

router.post('/cancel', async (req, res) => {
  const { tran_id } = req.body
  try {
    const rows = await query(`SELECT * FROM payments WHERE tran_id = ?`, [tran_id])
    const payment = rows[0]
    if (payment && payment.status === 'PENDING') {
      await query(`UPDATE payments SET status = 'CANCELLED' WHERE id = ?`, [payment.id])
    }
    res.redirect(`${FRONTEND_URL}/payment/result?status=cancel&payment_id=${payment ? payment.id : ''}`)
  } catch (err) {
    console.error('Payment cancel-callback error:', err)
    res.redirect(`${FRONTEND_URL}/payment/result?status=cancel`)
  }
})

// ─── IPN — server-to-server source of truth ──────────────────────────────────
router.post('/ipn', async (req, res) => {
  const { tran_id, val_id } = req.body
  try {
    const rows = await query(`SELECT * FROM payments WHERE tran_id = ?`, [tran_id])
    const payment = rows[0]
    if (!payment) return res.sendStatus(404)
    if (payment.status === 'SUCCESS') return res.sendStatus(200)

    const validation = await validateWithGateway(val_id)
    const isValid =
      ['VALID', 'VALIDATED'].includes(validation.status) &&
      Number(validation.amount).toFixed(2) === Number(payment.amount).toFixed(2)

    if (!isValid) {
      await query(`UPDATE payments SET status = 'FAILED', gateway_response = ? WHERE id = ?`, [
        JSON.stringify(validation),
        payment.id,
      ])
      return res.sendStatus(200)
    }

    const resolvedMethod = validation.card_type || validation.card_issuer || 'unknown'
    await query(
      `UPDATE payments SET status = 'SUCCESS', val_id = ?, payment_method = ?, gateway_response = ? WHERE id = ?`,
      [val_id, resolvedMethod, JSON.stringify(validation), payment.id]
    )
    await applySuccessfulPayment({ ...payment, status: 'SUCCESS', payment_method: resolvedMethod })
    res.sendStatus(200)
  } catch (err) {
    console.error('Payment IPN error:', err)
    res.sendStatus(500)
  }
})

// ─── 5. GET /api/payments/:id/status ─────────────────────────────────────────
router.get('/:id/status', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, service_type, reference_id, amount, status, payment_method, description, created_at, updated_at
       FROM payments WHERE id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('Payment status error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// ─── 6. GET /api/payments/history/:userId ────────────────────────────────────
router.get('/history/:userId', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, service_type, reference_id, amount, status, payment_method, description, created_at
       FROM payments WHERE payer_id = ? AND status = 'SUCCESS' ORDER BY created_at DESC`,
      [req.params.userId]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Payment history error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router