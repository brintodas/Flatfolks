/**
 * pages/PaymentsPage.jsx
 * Payments Portal — FlatFolks
 *
 * Loads due payments and history from the API.
 * The payment modal works in two modes:
 *   1. If SSLCommerz returns a gateway URL → redirect user there
 *   2. If SSLCommerz is not configured (dev mode) → POST /direct-confirm locally
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API = 'http://localhost:8000/api'

const STATUS_STYLES = {
  SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
}

const SERVICE_LABELS = {
  rent: 'Rent',
  advance_payment: 'Advance Deposit',
  maintenance: 'Maintenance',
  utility_assistance: 'Utility',
  shared_bill: 'Shared Bill',
  meal: 'Meal Plan',
  other: 'Other',
}

const SERVICE_ICON = {
  rent: 'fa-house',
  advance_payment: 'fa-key',
  maintenance: 'fa-wrench',
  utility_assistance: 'fa-bolt',
  shared_bill: 'fa-users',
  meal: 'fa-utensils',
  other: 'fa-circle-dollar-to-slot',
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const [duePayments, setDuePayments] = useState([])
  const [history, setHistory] = useState([])
  const [loadingDues, setLoadingDues] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  const [selectedPayment, setSelectedPayment] = useState(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: currentUser?.full_name || currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    method: '',
    bank: '',
  })
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [successPaymentId, setSuccessPaymentId] = useState(null)

  useEffect(() => {
    document.title = 'Payments – Flatfolks'
  }, [])

  // ── Load due payments ───────────────────────────────────────────────────────
  const loadDues = useCallback(async () => {
    if (!currentUser?.id) { setLoadingDues(false); return }
    setLoadingDues(true)
    try {
      const r = await fetch(`${API}/payments/due/${currentUser.id}`)
      const data = await r.json()
      if (data.success) setDuePayments(data.data)
    } catch (_) {}
    finally { setLoadingDues(false) }
  }, [currentUser?.id])

  // ── Load payment history ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) { setLoadingHistory(false); return }
    setLoadingHistory(true)
    try {
      const r = await fetch(`${API}/payments/history/${currentUser.id}`)
      const data = await r.json()
      if (data.success) setHistory(data.data)
    } catch (_) {}
    finally { setLoadingHistory(false) }
  }, [currentUser?.id])

  // ── Cancel an unpaid maintenance booking directly from the due list ────────
  // (Advance-deposit dues aren't cancellable here — that flow goes through
  // the landlord, not the payer.)
  const [cancellingId, setCancellingId] = useState(null)
  const handleCancelDue = async (payment) => {
    if (payment.type !== 'maintenance') return
    if (!window.confirm('Cancel this maintenance booking? You will not be charged.')) return
    setCancellingId(payment.id)
    try {
      const res = await fetch(
        `${API}/maintenance/bookings/${payment.reference_id}?user_id=${currentUser.id}`,
        { method: 'DELETE' }
      )
      const json = await res.json()
      if (json.success) {
        setDuePayments((prev) => prev.filter((p) => p.id !== payment.id))
      } else {
        alert(json.message || 'Could not cancel this booking.')
      }
    } catch (err) {
      alert('Network error while cancelling.')
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    loadDues()
    loadHistory()
  }, [loadDues, loadHistory])

  // ── Pre-open modal if redirected from Maintenance / Notification ─────────────
  useEffect(() => {
    const stype = searchParams.get('service_type')
    const refId = searchParams.get('reference_id')
    const amount = searchParams.get('amount')
    const title = searchParams.get('title')
    if (stype && amount) {
      setSelectedPayment({
        id: `url_${stype}_${refId}`,
        type: stype,
        service_type: stype,
        reference_id: refId ? Number(refId) : null,
        description: title || SERVICE_LABELS[stype] || stype,
        amount: Number(amount),
      })
      setStep(1)
    }
  }, [searchParams])

  // ── Payment flow ────────────────────────────────────────────────────────────
  const handlePayClick = (payment) => {
    setSelectedPayment(payment)
    setStep(1)
    setPayError('')
    setFormData({
      name: currentUser?.full_name || currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      method: '',
      bank: '',
    })
  }

  const handleCloseModal = () => {
    if (step === 3) return

    // The booking behind this modal is already PENDING_PAYMENT on the server —
    // closing the modal (instead of paying) should never make it disappear.
    // Make sure it's sitting in Due Payments so there's a way back in to pay it.
    if (selectedPayment) {
      setDuePayments((prev) => {
        const alreadyThere = prev.some(
          (p) =>
            p.type === selectedPayment.type &&
            p.reference_id === selectedPayment.reference_id
        )
        if (alreadyThere) return prev
        return [
          {
            ...selectedPayment,
            id: `${selectedPayment.type}_${selectedPayment.reference_id}`,
          },
          ...prev,
        ]
      })
    }

    setSelectedPayment(null)
    setPayError('')
    // Remove URL params if modal was opened from URL
    navigate('/payments', { replace: true })
    // Re-sync with the server so Due Payments reflects real backend state
    // (also self-heals if the item was already there under a different id).
    loadDues()
  }

  const handleProceedToGateway = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.phone || !formData.method) {
      setPayError('Please fill all required fields and select a payment method.')
      return
    }
    if (formData.method === 'bank' && !formData.bank) {
      setPayError('Please select a bank.')
      return
    }
    setPayError('')
    setStep(2)
  }

  const handleFinalPay = async (e) => {
    e.preventDefault()
    setPaying(true)
    setPayError('')
    setStep(3)

    try {
      // Step A: Initiate payment (creates DB row, optionally gets gateway URL)
      const initiateRes = await fetch(`${API}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer_id: currentUser?.id,
          service_type: selectedPayment.service_type || selectedPayment.type,
          reference_id: selectedPayment.reference_id,
          amount: selectedPayment.amount,
          description: selectedPayment.description,
          payer_name: formData.name,
          payer_email: formData.email || `${currentUser?.id}@flatfolks.local`,
          payer_phone: formData.phone,
        }),
      })
      const initiateData = await initiateRes.json()

      if (!initiateData.success) {
        throw new Error(initiateData.message || 'Failed to initiate payment')
      }

      // Step B: If SSLCommerz returned a URL, redirect there
      if (initiateData.gateway_url) {
        window.location.href = initiateData.gateway_url
        return
      }

      // Step C: SSLCommerz not configured — use direct-confirm (dev mode)
      const confirmRes = await fetch(`${API}/payments/direct-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: initiateData.payment_id,
          payment_method: formData.method + (formData.bank ? `_${formData.bank}` : ''),
        }),
      })
      const confirmData = await confirmRes.json()

      if (!confirmData.success) {
        throw new Error(confirmData.message || 'Payment confirmation failed')
      }

      setSuccessPaymentId(initiateData.payment_id)

      // Remove this item from dues
      setDuePayments((prev) => prev.filter((p) => p.id !== selectedPayment.id))

      // Refresh history
      await loadHistory()

      // Stay on step 3 (success screen) — no auto-close

    } catch (err) {
      console.error('Payment error:', err)
      setPayError(err.message || 'Payment failed. Please try again.')
      setStep(2) // Go back to method entry on error
    } finally {
      setPaying(false)
    }
  }

  const handleDoneAfterSuccess = () => {
    setSelectedPayment(null)
    setSuccessPaymentId(null)
    setStep(1)
    navigate('/payments', { replace: true })
  }

  // ── Redirect if not logged in ───────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <i className="fa-solid fa-lock text-blue-600 text-2xl" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sign in to view payments</h2>
        <p className="text-sm text-slate-500 mb-6">You need to be logged in to access the Payments Portal.</p>
        <a href="/signin" className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-colors">
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4 relative">
      {/* Header gradient */}
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-blue-900 to-blue-800 rounded-b-[3rem] -z-10 shadow-lg" />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-white">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Payments Portal</h1>
            <p className="text-blue-200 mt-1 font-medium">Manage your dues and transaction history.</p>
          </div>
          <div className="mt-4 md:mt-0 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20 text-sm font-semibold text-white">
            <i className="fa-solid fa-user-circle mr-2" />
            {currentUser.full_name || currentUser.name}
          </div>
        </div>

        {/* ── DUE PAYMENTS ── */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <i className="fa-solid fa-file-invoice-dollar text-lg" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Due Payments</h2>
          </div>

          {loadingDues ? (
            <div className="text-center py-10">
              <i className="fa-solid fa-circle-notch fa-spin text-blue-500 text-2xl mb-2" />
              <p className="text-sm text-slate-400">Loading your dues...</p>
            </div>
          ) : duePayments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duePayments.map((p) => (
                <div key={p.id} className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                        <i className={`fa-solid ${SERVICE_ICON[p.type] || 'fa-circle-dollar-to-slot'} text-[10px]`} />
                        {SERVICE_LABELS[p.type] || p.type}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-slate-800 mt-2">{p.description}</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-3">৳{Number(p.amount).toLocaleString()}</p>
                  </div>
                  <div className="mt-6 flex gap-2">
                    {p.type === 'maintenance' && (
                      <button
                        onClick={() => handleCancelDue(p)}
                        disabled={cancellingId === p.id}
                        className="py-3 px-4 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-600 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                        title="Cancel booking"
                      >
                        {cancellingId === p.id ? (
                          <i className="fa-solid fa-circle-notch fa-spin" />
                        ) : (
                          <i className="fa-regular fa-trash-can" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handlePayClick(p)}
                      className="flex-1 py-3 bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                    >
                      Pay Now <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <i className="fa-solid fa-check-double text-2xl text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">All caught up!</h3>
              <p className="text-sm text-slate-500 mt-1">You have no due payments at the moment.</p>
            </div>
          )}
        </div>

        {/* ── PAYMENT HISTORY ── */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <i className="fa-solid fa-clock-rotate-left text-lg" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">
              <i className="fa-solid fa-circle-notch fa-spin text-slate-400 text-xl mb-2" />
              <p className="text-sm text-slate-400">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 italic">No completed payments recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b-2 border-slate-100">
                    <th className="py-3 px-4 font-semibold">Service</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Method</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <i className={`fa-solid ${SERVICE_ICON[p.service_type] || 'fa-circle-dollar-to-slot'} text-blue-500`} />
                          {SERVICE_LABELS[p.service_type] || p.service_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 font-medium">{p.description || '—'}</td>
                      <td className="py-4 px-4 text-sm text-slate-500 capitalize">{p.payment_method || '—'}</td>
                      <td className="py-4 px-4 text-sm text-slate-500">
                        {new Date(p.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-900 text-right">৳{Number(p.amount).toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_STYLES[p.status] || 'bg-slate-100 text-slate-500'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── PAYMENT MODAL ── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-lg">Secure Checkout</h3>
              {step !== 3 && (
                <button onClick={handleCloseModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                  <i className="fa-solid fa-xmark text-lg" />
                </button>
              )}
            </div>

            <div className="p-8 max-h-[85vh] overflow-y-auto">
              {/* Payment summary */}
              <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <i className={`fa-solid ${SERVICE_ICON[selectedPayment.type] || 'fa-circle-dollar-to-slot'}`} />
                    {SERVICE_LABELS[selectedPayment.type] || selectedPayment.type}
                  </p>
                  <p className="text-base font-semibold text-slate-800 mt-1">{selectedPayment.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Amount Due</p>
                  <p className="text-2xl font-extrabold text-slate-900">৳{Number(selectedPayment.amount).toLocaleString()}</p>
                </div>
              </div>

              {/* ── Step 1: Info + Method ── */}
              {step === 1 && (
                <form onSubmit={handleProceedToGateway} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-800"
                        placeholder="e.g. Rahim Hossain"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-800"
                        placeholder="e.g. 01XXXXXXXXX"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-800"
                      placeholder="e.g. rahim@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Select Payment Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* bKash */}
                      <label className={`relative border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${formData.method === 'bkash' ? 'border-pink-500 bg-pink-50/30 shadow-md shadow-pink-100' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                        <input type="radio" name="method" className="sr-only" onChange={() => setFormData({ ...formData, method: 'bkash', bank: '' })} />
                        {formData.method === 'bkash' && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />}
                        <img src="https://freelogopng.com/images/all_img/1656227448bkash-logo-png.png" alt="bKash" className="h-8 object-contain mb-2" onError={e => { e.target.className = 'hidden' }} />
                        <span className="font-extrabold text-pink-600 text-xs">bKash</span>
                      </label>

                      {/* Nagad */}
                      <label className={`relative border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${formData.method === 'nagad' ? 'border-orange-500 bg-orange-50/30 shadow-md shadow-orange-100' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                        <input type="radio" name="method" className="sr-only" onChange={() => setFormData({ ...formData, method: 'nagad', bank: '' })} />
                        {formData.method === 'nagad' && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />}
                        <img src="https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png" alt="Nagad" className="h-10 object-contain mb-1" onError={e => { e.target.className = 'hidden' }} />
                        <span className="font-extrabold text-orange-600 text-xs">Nagad</span>
                      </label>

                      {/* Upay */}
                      <label className={`relative border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${formData.method === 'upay' ? 'border-yellow-500 bg-yellow-50/30 shadow-md shadow-yellow-100' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                        <input type="radio" name="method" className="sr-only" onChange={() => setFormData({ ...formData, method: 'upay', bank: '' })} />
                        {formData.method === 'upay' && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-yellow-500" />}
                        <div className="font-extrabold text-xl text-blue-800 tracking-tighter mb-1">upay</div>
                        <span className="font-extrabold text-blue-800 text-xs">Upay</span>
                      </label>

                      {/* Rocket */}
                      <label className={`relative border-2 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${formData.method === 'rocket' ? 'border-purple-500 bg-purple-50/30 shadow-md shadow-purple-100' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                        <input type="radio" name="method" className="sr-only" onChange={() => setFormData({ ...formData, method: 'rocket', bank: '' })} />
                        {formData.method === 'rocket' && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500" />}
                        <div className="font-extrabold text-purple-700 mb-1 text-lg"><i className="fa-solid fa-rocket" /></div>
                        <span className="font-extrabold text-purple-700 text-xs">Rocket</span>
                      </label>
                    </div>

                    {/* Bank Transfer */}
                    <div className="mt-3">
                      <label className={`relative border-2 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${formData.method === 'bank' ? 'border-indigo-500 bg-indigo-50/30 shadow-md shadow-indigo-100' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                        <input type="radio" name="method" className="sr-only" onChange={() => setFormData({ ...formData, method: 'bank' })} />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.method === 'bank' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          <i className="fa-solid fa-building-columns text-lg" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-extrabold ${formData.method === 'bank' ? 'text-indigo-700' : 'text-slate-700'}`}>Bank Transfer / Cards</p>
                          <p className="text-xs text-slate-500 font-medium">Pay via Visa, Mastercard, or local bank accounts</p>
                        </div>
                        {formData.method === 'bank' && <div className="w-3 h-3 rounded-full bg-indigo-500" />}
                      </label>
                    </div>

                    {formData.method === 'bank' && (
                      <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Select your Bank</label>
                        <select
                          required
                          value={formData.bank}
                          onChange={e => setFormData({ ...formData, bank: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-indigo-200 bg-white rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                        >
                          <option value="">-- Choose a Bank --</option>
                          <option value="brac">BRAC Bank</option>
                          <option value="city">City Bank</option>
                          <option value="dbbl">Dutch-Bangla Bank (DBBL)</option>
                          <option value="ebl">Eastern Bank (EBL)</option>
                          <option value="islami">Islami Bank</option>
                          <option value="mtb">Mutual Trust Bank</option>
                          <option value="visa_master">Visa / Mastercard</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {payError && (
                    <p className="text-sm text-red-600 font-medium bg-red-50 px-4 py-2 rounded-xl">{payError}</p>
                  )}

                  <button type="submit" className="w-full mt-2 py-4 bg-slate-900 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all shadow-lg hover:shadow-blue-600/30 flex justify-center items-center gap-2 text-lg">
                    Proceed to Checkout <i className="fa-solid fa-arrow-right-long" />
                  </button>
                </form>
              )}

              {/* ── Step 2: Method-specific credential entry ── */}
              {step === 2 && (
                <form onSubmit={handleFinalPay} className="space-y-6">
                  {formData.method === 'bkash' && (
                    <div className="text-center space-y-5 py-4 px-2 border-2 border-pink-100 rounded-2xl bg-gradient-to-b from-white to-pink-50/50 shadow-sm">
                      <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border-4 border-white">
                        <i className="fa-solid fa-mobile-screen-button text-3xl text-pink-600" />
                      </div>
                      <p className="font-extrabold text-slate-800 text-xl tracking-tight">bKash Secure Checkout</p>
                      <div className="space-y-4 px-4 pb-4">
                        <input type="text" required className="w-full px-4 py-3.5 text-center border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="bKash Number" defaultValue={formData.phone} />
                        <input type="password" required className="w-full px-4 py-3.5 text-center border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Enter PIN" />
                      </div>
                    </div>
                  )}

                  {formData.method === 'nagad' && (
                    <div className="text-center space-y-5 py-4 px-2 border-2 border-orange-100 rounded-2xl bg-gradient-to-b from-white to-orange-50/50 shadow-sm">
                      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border-4 border-white">
                        <img src="https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png" alt="Nagad" className="h-12 object-contain" />
                      </div>
                      <p className="font-extrabold text-slate-800 text-xl tracking-tight">Nagad Secure Checkout</p>
                      <div className="space-y-4 px-4 pb-4">
                        <input type="text" required className="w-full px-4 py-3.5 text-center border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Nagad Account Number" defaultValue={formData.phone} />
                        <input type="password" required className="w-full px-4 py-3.5 text-center border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Enter PIN" />
                      </div>
                    </div>
                  )}

                  {formData.method === 'upay' && (
                    <div className="text-center space-y-5 py-4 px-2 border-2 border-yellow-200 rounded-2xl bg-gradient-to-b from-white to-yellow-50/50 shadow-sm">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border-4 border-white">
                        <span className="font-extrabold text-3xl text-blue-800 tracking-tighter">upay</span>
                      </div>
                      <p className="font-extrabold text-slate-800 text-xl tracking-tight">Upay Secure Checkout</p>
                      <div className="space-y-4 px-4 pb-4">
                        <input type="text" required className="w-full px-4 py-3.5 text-center border-2 border-yellow-400 rounded-xl focus:outline-none focus:border-blue-600 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Upay Account Number" defaultValue={formData.phone} />
                        <input type="password" required className="w-full px-4 py-3.5 text-center border-2 border-yellow-400 rounded-xl focus:outline-none focus:border-blue-600 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Enter PIN" />
                      </div>
                    </div>
                  )}

                  {formData.method === 'rocket' && (
                    <div className="text-center space-y-5 py-4 px-2 border-2 border-purple-200 rounded-2xl bg-gradient-to-b from-white to-purple-50/50 shadow-sm">
                      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border-4 border-white">
                        <i className="fa-solid fa-rocket text-3xl text-purple-700" />
                      </div>
                      <p className="font-extrabold text-slate-800 text-xl tracking-tight">Rocket Secure Checkout</p>
                      <div className="space-y-4 px-4 pb-4">
                        <input type="text" required className="w-full px-4 py-3.5 text-center border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Rocket Account Number" defaultValue={formData.phone} />
                        <input type="password" required className="w-full px-4 py-3.5 text-center border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-bold tracking-widest text-lg shadow-sm" placeholder="Enter PIN" />
                      </div>
                    </div>
                  )}

                  {formData.method === 'bank' && (
                    <div className="text-center space-y-5 py-4 px-2 border-2 border-indigo-100 rounded-2xl bg-gradient-to-b from-white to-indigo-50/50 shadow-sm">
                      <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner border-4 border-white">
                        <i className="fa-solid fa-building-columns text-3xl text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 text-xl tracking-tight">Bank Transfer / Card</p>
                        <p className="text-sm font-bold text-indigo-600 uppercase mt-1">{formData.bank?.replace('_', ' ')}</p>
                      </div>
                      <div className="space-y-4 px-4 pb-4 text-left">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Card / Account Number</label>
                          <input type="text" required className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-bold text-slate-800 shadow-sm" placeholder="XXXX XXXX XXXX XXXX" />
                        </div>
                        <div className="flex gap-4">
                          <div className="space-y-1 w-1/2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Expiry</label>
                            <input type="text" required placeholder="MM/YY" className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-bold text-slate-800 shadow-sm" />
                          </div>
                          <div className="space-y-1 w-1/2">
                            <label className="text-xs font-bold text-slate-500 uppercase">CVC / PIN</label>
                            <input type="password" required placeholder="***" className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-bold text-slate-800 shadow-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {payError && (
                    <p className="text-sm text-red-600 font-medium bg-red-50 px-4 py-2 rounded-xl">{payError}</p>
                  )}

                  <div className="flex gap-4 pt-2">
                    <button type="button" onClick={() => setStep(1)} className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all">
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={paying}
                      className={`w-2/3 py-4 text-white font-extrabold rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg text-lg disabled:opacity-60
                        ${formData.method === 'bkash' ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-600/30' :
                          formData.method === 'nagad' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30' :
                          formData.method === 'upay' ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/30' :
                          formData.method === 'rocket' ? 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/30' :
                          'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
                    >
                      {paying ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-lock text-sm" />}
                      {paying ? 'Processing...' : `Pay ৳${Number(selectedPayment.amount).toLocaleString()}`}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Step 3: Processing / Success ── */}
              {step === 3 && (
                <div className="py-10 text-center space-y-6">
                  {paying ? (
                    <>
                      <div className="relative w-28 h-28 mx-auto">
                        <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-75" />
                        <div className="relative w-full h-full bg-blue-100 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
                          <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Processing Payment</h3>
                        <p className="text-slate-500 font-medium">Please wait while we confirm your transaction securely...</p>
                      </div>
                      <div className="w-48 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse w-3/4 mx-auto" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative w-28 h-28 mx-auto">
                        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-75" />
                        <div className="relative w-full h-full bg-emerald-100 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
                          <i className="fa-solid fa-check text-5xl text-emerald-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Payment Successful!</h3>
                        <p className="text-slate-500 font-medium">Your payment has been confirmed.</p>
                        {successPaymentId && (
                          <p className="text-xs text-slate-400 mt-1">Transaction ID: #{successPaymentId}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 pt-4">
                        {(selectedPayment.type === 'advance_payment') && (
                          <button
                            onClick={() => { handleDoneAfterSuccess(); navigate('/my-tenancy') }}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
                          >
                            View My Tenancy →
                          </button>
                        )}
                        {(selectedPayment.type === 'maintenance') && (
                          <button
                            onClick={() => { handleDoneAfterSuccess(); navigate('/maintenance') }}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                          >
                            View Maintenance Log →
                          </button>
                        )}
                        <button
                          onClick={handleDoneAfterSuccess}
                          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                        >
                          Back to Payments
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}