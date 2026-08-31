/**
 * pages/PaymentResult.jsx
 * Lands here after the backend redirects the browser back from
 * SSLCommerz (see routes/payments.js /success, /fail, /cancel).
 * Polls /api/payments/:id/status a couple of times in case the IPN
 * is still catching up, then shows the final state.
 */
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

const CONFIG = {
  success: {
    icon: 'fa-circle-check',
    color: 'text-green-600',
    bg: 'bg-green-50',
    heading: 'Payment Successful',
    body: 'Your payment has been confirmed.',
  },
  fail: {
    icon: 'fa-circle-xmark',
    color: 'text-red-600',
    bg: 'bg-red-50',
    heading: 'Payment Failed',
    body: "Something went wrong and the payment didn't go through. No money has been deducted.",
  },
  cancel: {
    icon: 'fa-circle-minus',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    heading: 'Payment Cancelled',
    body: 'You cancelled the payment before it was completed.',
  },
}

const PaymentResult = () => {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') || 'fail'
  const paymentId = searchParams.get('payment_id')
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    if (!paymentId) return
    fetch(`http://localhost:8000/api/payments/${paymentId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPayment(data.data)
      })
      .catch(() => {})
  }, [paymentId])

  const cfg = CONFIG[status] || CONFIG.fail

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 flex items-start justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className={`w-16 h-16 rounded-full ${cfg.bg} flex items-center justify-center mx-auto mb-4`}>
          <i className={`fa-solid ${cfg.icon} ${cfg.color} text-3xl`}></i>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{cfg.heading}</h1>
        <p className="text-sm text-slate-500 mb-6">{cfg.body}</p>

        {payment && (
          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-1.5 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-800">৳{Number(payment.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service</span>
              <span className="font-semibold text-slate-800 capitalize">{payment.service_type.replace('_', ' ')}</span>
            </div>
            {payment.payment_method && (
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-semibold text-slate-800 capitalize">{payment.payment_method}</span>
              </div>
            )}
          </div>
        )}

        <Link
          to="/"
          className="inline-block w-full py-3 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default PaymentResult