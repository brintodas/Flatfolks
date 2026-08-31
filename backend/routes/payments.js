/**
 * routes/payments.js
 * Centralized Payment Gateway — FlatFolks
 * Mounted at: /api/payments
 *
 * Every payable thing on the platform (rent, maintenance bookings,
 * utility assistance, shared bills, ...) goes through the same
 * three steps:
 *   1. POST /initiate   -> app creates a PENDING `payments` row and
 *                           asks SSLCommerz for a hosted checkout URL
 *   2. user pays on SSLCommerz's page
 *   3. SSLCommerz POSTs back to /success, /fail or /cancel (and also
 *      to /ipn server-to-server, which is the source of truth) ->
 *      we validate the transaction, mark it SUCCESS/FAILED/CANCELLED,
 *      then run service-specific side effects (e.g. crediting
 *      rent_payments + notifying the landlord for rent).
 *
 * Required .env vars: see config/sslcommerz.js
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const sslcz = require('../config/sslcommerz')

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// SSLCommerz posts these callbacks as classic form submissions, not JSON
router.use(express.urlencoded({ extended: true }))

const VALID_SERVICE_TYPES = ['rent', 'maintenance', 'utility_assistance', 'shared_bill', 'other']

function makeTranId(serviceType) {
  return `FF-${serviceType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Notification helper (shared by any service_type handler below) ────────
async function createNotification({ user_id, type, title, message, related_type = 'payment', related_id = null }) {
  if (!user_id) return
  await query(
    `INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, type, title, message || null, related_type, related_id]
  )
}

// ─── Service-specific side effects, run once a payment is confirmed SUCCESS ─
async function applySuccessfulPayment(payment) {
  if (payment.service_type === 'rent') {
    // idempotency guard: /success (browser) and /ipn (server-to-server) can
    // both fire for the same payment — make sure we only credit revenue once
    const already = await query(`SELECT id FROM rent_payments WHERE payment_id = ? LIMIT 1`, [payment.id])
    if (already.length > 0) return

    const tenancies = await query(
      `SELECT t.*, l.title AS listing_title FROM tenancies t
       JOIN listings l ON l.id = t.listing_id WHERE t.id = ?`,
      [payment.reference_id]
    )
    const tenancy = tenancies[0]
    if (!tenancy) return

    const paymentMonth = new Date().toISOString().slice(0, 7) + '-01' // first of current month

    await query(
      `INSERT INTO rent_payments (tenancy_id, landlord_id, amount, payment_id, payment_method, payment_month)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenancy.id, tenancy.landlord_id, payment.amount, payment.id, payment.payment_method || 'unknown', paymentMonth]
    )

    await query(`UPDATE payments SET payee_id = ? WHERE id = ?`, [tenancy.landlord_id, payment.id])

    // this is the "instant notification" the landlord dashboard polls for
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

  if (payment.service_type === 'maintenance') {
    await query(`UPDATE service_requests SET cost = ?, status = 'CONFIRMED' WHERE id = ?`, [
      payment.amount,
      payment.reference_id,
    ])
    return
  }

  if (payment.service_type === 'utility_assistance') {
    await query(`UPDATE utility_assistance_requests SET status = 'IN_PROGRESS' WHERE id = ?`, [
      payment.reference_id,
    ])
    return
  }

  // 'shared_bill' / 'other' — nothing extra to do beyond the payments row itself.
  // expense_splits.is_settled is updated separately by the bills settlement flow
  // if reference_id points at an expense_splits row; add a branch here if needed.
}

// ─── 1. POST /api/payments/initiate ──────────────────────────────────────────
// Body: { payer_id, service_type, reference_id, amount, description, payer_name, payer_email, payer_phone }
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
      store_id: sslcz.store_id,
      store_passwd: sslcz.store_passwd,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${sslcz.app_base_url}/api/payments/success`,
      fail_url: `${sslcz.app_base_url}/api/payments/fail`,
      cancel_url: `${sslcz.app_base_url}/api/payments/cancel`,
      ipn_url: `${sslcz.app_base_url}/api/payments/ipn`,
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
      // round-trip our own ids through SSLCommerz so we can find the row
      // again even if a callback ever arrives without our tran_id intact
      value_a: String(paymentId),
      value_b: service_type,
      value_c: reference_id ? String(reference_id) : '',
      value_d: payer_id ? String(payer_id) : '',
    })

    const sslRes = await fetch(`${sslcz.api_base}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: gatewayParams,
    })
    const sslData = await sslRes.json()

    if (sslData.status !== 'SUCCESS' || !sslData.GatewayPageURL) {
      await query(`UPDATE payments SET status = 'FAILED', gateway_response = ? WHERE id = ?`, [
        JSON.stringify(sslData),
        paymentId,
      ])
      return res.status(502).json({
        success: false,
        message: sslData.failedreason || 'Payment gateway rejected the request',
      })
    }

    res.json({
      success: true,
      payment_id: paymentId,
      tran_id: tranId,
      gateway_url: sslData.GatewayPageURL,
    })
  } catch (err) {
    console.error('Payment initiate error:', err)
    res.status(500).json({ success: false, message: 'Could not start payment' })
  }
})

// ─── Shared validation against SSLCommerz, used by success + ipn ───────────
async function validateWithGateway(val_id) {
  const params = new URLSearchParams({
    val_id,
    store_id: sslcz.store_id,
    store_passwd: sslcz.store_passwd,
    format: 'json',
  })
  const r = await fetch(`${sslcz.api_base}/validator/api/validationserverAPI.php?${params.toString()}`)
  return r.json()
}

// ─── 2. Gateway callbacks (browser redirects) ───────────────────────────────
// SSLCommerz POSTs form data here. These fire the browser back to our
// backend first so we can confirm the transaction server-side, then we
// bounce the user on to the frontend result page.
router.post('/success', async (req, res) => {
  const { tran_id, val_id, amount } = req.body
  try {
    const rows = await query(`SELECT * FROM payments WHERE tran_id = ?`, [tran_id])
    const payment = rows[0]
    if (!payment) return res.redirect(`${sslcz.frontend_base_url}/payment/result?status=fail&reason=not_found`)

    // idempotency guard: IPN may have already processed this
    if (payment.status === 'SUCCESS') {
      return res.redirect(`${sslcz.frontend_base_url}/payment/result?status=success&payment_id=${payment.id}`)
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
      return res.redirect(`${sslcz.frontend_base_url}/payment/result?status=fail&payment_id=${payment.id}`)
    }

    const resolvedMethod = validation.card_type || validation.card_issuer || 'unknown'
    await query(
      `UPDATE payments SET status = 'SUCCESS', val_id = ?, payment_method = ?, gateway_response = ? WHERE id = ?`,
      [val_id, resolvedMethod, JSON.stringify(validation), payment.id]
    )

    await applySuccessfulPayment({ ...payment, status: 'SUCCESS', payment_method: resolvedMethod })

    res.redirect(`${sslcz.frontend_base_url}/payment/result?status=success&payment_id=${payment.id}`)
  } catch (err) {
    console.error('Payment success-callback error:', err)
    res.redirect(`${sslcz.frontend_base_url}/payment/result?status=fail&reason=server_error`)
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
    res.redirect(`${sslcz.frontend_base_url}/payment/result?status=fail&payment_id=${payment ? payment.id : ''}`)
  } catch (err) {
    console.error('Payment fail-callback error:', err)
    res.redirect(`${sslcz.frontend_base_url}/payment/result?status=fail`)
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
    res.redirect(`${sslcz.frontend_base_url}/payment/result?status=cancel&payment_id=${payment ? payment.id : ''}`)
  } catch (err) {
    console.error('Payment cancel-callback error:', err)
    res.redirect(`${sslcz.frontend_base_url}/payment/result?status=cancel`)
  }
})

// ─── 3. IPN — server-to-server, the source of truth ─────────────────────────
// Configure this exact URL as the "IPN URL" in your SSLCommerz merchant panel.
// Runs the same validation as /success but never touches the browser, so it
// still lands the payment correctly even if the user closes the tab right
// after paying and before the browser redirect completes.
router.post('/ipn', async (req, res) => {
  const { tran_id, val_id } = req.body
  try {
    const rows = await query(`SELECT * FROM payments WHERE tran_id = ?`, [tran_id])
    const payment = rows[0]
    if (!payment) return res.sendStatus(404)
    if (payment.status === 'SUCCESS') return res.sendStatus(200) // already handled

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

// ─── 4. GET /api/payments/:id/status — frontend polls this on the result page
router.get('/:id/status', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, service_type, reference_id, amount, status, payment_method, created_at, updated_at
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

// ─── 5. GET /api/payments/history/:userId — a user's own payment history
router.get('/history/:userId', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, service_type, reference_id, amount, status, payment_method, description, created_at
       FROM payments WHERE payer_id = ? ORDER BY created_at DESC`,
      [req.params.userId]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Payment history error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router