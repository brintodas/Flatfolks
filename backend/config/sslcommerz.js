/**
 * config/sslcommerz.js
 * SSLCommerz payment gateway configuration
 * Required .env vars:
 *   SSLCZ_STORE_ID     — your SSLCommerz store ID
 *   SSLCZ_STORE_PASSWD — your SSLCommerz store password
 *   SSLCZ_IS_LIVE      — 'true' for production, 'false' (default) for sandbox
 *   BACKEND_URL        — e.g. http://localhost:8000  (no trailing slash)
 *   FRONTEND_URL       — e.g. http://localhost:5173  (no trailing slash)
 */

const SSLCommerzPayment = require('sslcommerz-lts')

const storeId     = process.env.SSLCZ_STORE_ID     || 'your_store_id'
const storePasswd = process.env.SSLCZ_STORE_PASSWD  || 'your_store_password'
const isLive      = process.env.SSLCZ_IS_LIVE === 'true'

/**
 * Initiate a payment session with SSLCommerz.
 * Returns the GatewayPageURL to redirect the user to.
 */
async function initiatePayment(data) {
  const sslcz = new SSLCommerzPayment(storeId, storePasswd, isLive)
  const response = await sslcz.init(data)
  return response
}

/**
 * Validate a payment after SSLCommerz posts back to /success.
 */
async function validatePayment(val_id) {
  const sslcz = new SSLCommerzPayment(storeId, storePasswd, isLive)
  const response = await sslcz.validate({ val_id })
  return response
}

module.exports = { initiatePayment, validatePayment, storeId, storePasswd, isLive }
