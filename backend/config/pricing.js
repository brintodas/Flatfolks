/**
 * config/pricing.js
 * Central place for payment-related fallback amounts.
 */
module.exports = {
  // Some services in the catalog don't have a fixed estimated_cost set yet
  // (e.g. "custom quote on visit" type services, or ones the admin hasn't
  // priced). Rather than let the advance/booking amount fall through as
  // ৳0 — which the payment gateway correctly rejects — we charge this flat
  // minimum advance fee instead so the student can still confirm & pay.
  MIN_ADVANCE_FEE: 200,
}