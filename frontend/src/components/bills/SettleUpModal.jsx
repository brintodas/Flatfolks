import { useState, useEffect } from 'react'
import { PAYMENT_METHODS, formatBDT } from '../../utils/expenseCalculations'

export default function SettleUpModal({
  isOpen,
  onClose,
  onSettle,
  members = [],
  currentUserId,
  initialPayerId = null,
  initialReceiverId = null,
  initialAmount = null,
}) {
  const [settleDirection, setSettleDirection] = useState('I_PAID') // 'I_PAID' (You paid) | 'I_RECEIVED' (Flatmate paid you)
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [amount, setAmount]                   = useState('')
  const [paymentMethod, setPaymentMethod]     = useState('bkash')
  const [notes, setNotes]                     = useState('')
  const [errorAlert, setErrorAlert]           = useState(null)
  const [saving, setSaving]                   = useState(false)

  const currentUserObj = members.find((m) => String(m.id) === String(currentUserId)) || {
    id: currentUserId,
    full_name: 'You',
  }

  const otherMembers = members.filter((m) => String(m.id) !== String(currentUserId))

  useEffect(() => {
    if (!isOpen) return

    setErrorAlert(null)
    setSaving(false)

    // Determine direction based on preloaded params or default to I_PAID
    let dir = 'I_PAID'
    let partner = ''

    if (initialReceiverId && String(initialReceiverId) === String(currentUserId)) {
      // Someone paid you
      dir = 'I_RECEIVED'
      partner = initialPayerId ? String(initialPayerId) : ''
    } else if (initialPayerId && String(initialPayerId) === String(currentUserId)) {
      // You paid someone
      dir = 'I_PAID'
      partner = initialReceiverId ? String(initialReceiverId) : ''
    } else if (initialReceiverId && String(initialReceiverId) !== String(currentUserId)) {
      dir = 'I_PAID'
      partner = String(initialReceiverId)
    } else if (initialPayerId && String(initialPayerId) !== String(currentUserId)) {
      dir = 'I_RECEIVED'
      partner = String(initialPayerId)
    }

    if (!partner && otherMembers.length > 0) {
      partner = String(otherMembers[0].id)
    }

    setSettleDirection(dir)
    setSelectedPartnerId(partner)

    if (initialAmount) {
      setAmount(String(initialAmount))
    } else {
      setAmount('')
    }

    setPaymentMethod('bkash')
    setNotes('')
  }, [isOpen, initialPayerId, initialReceiverId, initialAmount, currentUserId, members])

  if (!isOpen) return null

  // Calculate actual payer and receiver based on direction
  const effectivePayerId = settleDirection === 'I_PAID' ? currentUserId : Number(selectedPartnerId)
  const effectiveReceiverId = settleDirection === 'I_PAID' ? Number(selectedPartnerId) : currentUserId

  const payerObj = members.find((m) => String(m.id) === String(effectivePayerId)) || currentUserObj
  const receiverObj = members.find((m) => String(m.id) === String(effectiveReceiverId)) || currentUserObj

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorAlert(null)

    if (!selectedPartnerId) {
      setErrorAlert('Please select a flatmate for this settlement.')
      return
    }

    if (String(effectivePayerId) === String(effectiveReceiverId)) {
      setErrorAlert('Payer and receiver cannot be the same person.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorAlert('Please enter a valid payment amount greater than ৳0.')
      return
    }

    setSaving(true)
    try {
      await onSettle({
        payer_id: Number(effectivePayerId),
        receiver_id: Number(effectiveReceiverId),
        amount: numAmount,
        payment_method: paymentMethod,
        notes: notes.trim(),
      })
      onClose()
    } catch (err) {
      console.error('Failed to record settlement:', err)
      setErrorAlert(err.message || 'Failed to record settlement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <i className="fa-solid fa-hand-holding-dollar text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold">Record Payment / Settle Up</h2>
              <p className="text-xs text-emerald-100">Log a settlement made between flatmates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorAlert && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
              <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-500"></i>
              <div className="flex-1 font-medium">{errorAlert}</div>
            </div>
          )}

          {/* Direction Switcher Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Settlement Direction
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSettleDirection('I_PAID')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settleDirection === 'I_PAID'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-arrow-up-from-bracket text-[11px]"></i>
                <span>I Paid a Flatmate</span>
              </button>
              <button
                type="button"
                onClick={() => setSettleDirection('I_RECEIVED')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settleDirection === 'I_RECEIVED'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-arrow-down-to-bracket text-[11px]"></i>
                <span>A Flatmate Paid Me</span>
              </button>
            </div>
          </div>

          {/* Visual Transfer Arrow */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
            {/* Payer Card */}
            <div className="flex-1 text-center">
              <div
                className={`w-10 h-10 mx-auto mb-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                  settleDirection === 'I_PAID'
                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {(payerObj?.full_name || payerObj?.name || 'Payer')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">
                {payerObj?.full_name || payerObj?.name || 'Payer'}
                {String(payerObj?.id) === String(currentUserId) ? ' (You)' : ''}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Sent payment</p>
            </div>

            <div className="flex flex-col items-center justify-center px-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </div>
              {amount > 0 && (
                <span className="text-xs font-extrabold text-emerald-700 mt-1">
                  {formatBDT(amount)}
                </span>
              )}
            </div>

            {/* Receiver Card */}
            <div className="flex-1 text-center">
              <div
                className={`w-10 h-10 mx-auto mb-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                  settleDirection === 'I_RECEIVED'
                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {(receiverObj?.full_name || receiverObj?.name || 'Receiver')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">
                {receiverObj?.full_name || receiverObj?.name || 'Receiver'}
                {String(receiverObj?.id) === String(currentUserId) ? ' (You)' : ''}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Received payment</p>
            </div>
          </div>

          {/* Locked Logged-in User Card & Flatmate Partner Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payer Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Who Paid?
              </label>
              {settleDirection === 'I_PAID' ? (
                <div className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-1.5 truncate">
                    <i className="fa-solid fa-user-check text-emerald-600"></i>
                    {currentUserObj.full_name || 'You'} (You)
                  </span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold shrink-0">
                    Logged In
                  </span>
                </div>
              ) : (
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-slate-800"
                  required
                >
                  {otherMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Receiver Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Who Received?
              </label>
              {settleDirection === 'I_RECEIVED' ? (
                <div className="w-full px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-1.5 truncate">
                    <i className="fa-solid fa-user-check text-blue-600"></i>
                    {currentUserObj.full_name || 'You'} (You)
                  </span>
                  <span className="text-[10px] bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold shrink-0">
                    Logged In
                  </span>
                </div>
              ) : (
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold text-slate-800"
                  required
                >
                  {otherMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Settlement Amount (৳) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">৳</span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <i className={`fa-solid ${pm.icon} text-sm`}></i>
                    <span className="text-[11px] font-bold">{pm.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Transaction Ref / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. bKash TrxID #89DJ23A or Cash at Room 302"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              {saving && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              <span>Record Settlement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
