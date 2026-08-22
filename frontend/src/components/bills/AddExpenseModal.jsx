import { useState, useEffect } from 'react'
import {
  CATEGORIES,
  SPLIT_TYPES,
  calculateSplits,
  formatBDT,
} from '../../utils/expenseCalculations'

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSave,
  members = [],
  currentUserId,
  editExpense = null,
}) {
  const [title, setTitle]             = useState('')
  const [amount, setAmount]           = useState('')
  const [category, setCategory]       = useState('wifi')
  const [payerId, setPayerId]         = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [splitType, setSplitType]     = useState(SPLIT_TYPES.EQUAL)
  const [notes, setNotes]             = useState('')
  const [receiptUrl, setReceiptUrl]   = useState('')

  // Selected participants (IDs)
  const [selectedUserIds, setSelectedUserIds] = useState([])
  // Custom exact values: { [userId]: string }
  const [exactValues, setExactValues]         = useState({})
  // Custom percentage values: { [userId]: string }
  const [percentValues, setPercentValues]     = useState({})

  const [errorAlert, setErrorAlert] = useState(null)
  const [saving, setSaving]         = useState(false)

  // Reset or populate on open/edit
  useEffect(() => {
    if (!isOpen) return

    setErrorAlert(null)
    setSaving(false)

    if (editExpense) {
      setTitle(editExpense.title || '')
      setAmount(String(editExpense.amount || ''))
      setCategory(editExpense.category || 'other')
      setPayerId(editExpense.payer_id ? String(editExpense.payer_id) : 'unpaid')
      setExpenseDate(editExpense.expense_date ? editExpense.expense_date.slice(0, 10) : new Date().toISOString().slice(0, 10))
      setSplitType(editExpense.split_type || SPLIT_TYPES.EQUAL)
      setNotes(editExpense.notes || '')
      setReceiptUrl(editExpense.receipt_url || '')

      if (editExpense.splits && editExpense.splits.length > 0) {
        const pIds = editExpense.splits.map((s) => Number(s.user_id || s.userId))
        setSelectedUserIds(pIds)
        const exactMap = {}
        const pctMap = {}
        editExpense.splits.forEach((s) => {
          const uid = Number(s.user_id || s.userId)
          exactMap[uid] = String(s.amount_owed || s.amount || '')
          pctMap[uid] = s.percentage ? String(s.percentage) : ''
        })
        setExactValues(exactMap)
        setPercentValues(pctMap)
      } else {
        setSelectedUserIds(members.map((m) => m.id))
      }
    } else {
      setTitle('')
      setAmount('')
      setCategory('wifi')
      setPayerId(String(currentUserId || members[0]?.id || ''))
      setExpenseDate(new Date().toISOString().slice(0, 10))
      setSplitType(SPLIT_TYPES.EQUAL)
      setNotes('')
      setReceiptUrl('')
      setSelectedUserIds(members.map((m) => m.id))
      setExactValues({})
      setPercentValues({})
    }
  }, [isOpen, editExpense, members, currentUserId])

  if (!isOpen) return null

  const activeParticipants = members.filter((m) => selectedUserIds.includes(m.id))

  // Calculate live preview of splits
  const customMap = splitType === SPLIT_TYPES.PERCENTAGE ? percentValues : exactValues
  const calcResult = calculateSplits(amount, splitType, activeParticipants, customMap)

  const toggleParticipant = (uid) => {
    if (selectedUserIds.includes(uid)) {
      if (selectedUserIds.length === 1) {
        setErrorAlert('At least one roommate must be included in the expense split.')
        return
      }
      setSelectedUserIds(selectedUserIds.filter((id) => id !== uid))
    } else {
      setSelectedUserIds([...selectedUserIds, uid])
    }
  }

  const handleCustomChange = (uid, val) => {
    setErrorAlert(null)
    if (splitType === SPLIT_TYPES.PERCENTAGE) {
      setPercentValues((prev) => ({ ...prev, [uid]: val }))
    } else {
      setExactValues((prev) => ({ ...prev, [uid]: val }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorAlert(null)

    if (!title.trim()) {
      setErrorAlert('Please enter an expense title (e.g. Wi-Fi bill).')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorAlert('Please enter a valid expense amount greater than ৳0.')
      return
    }

    if (!payerId) {
      setErrorAlert('Please select who paid or choose Pending Payment.')
      return
    }

    if (activeParticipants.length === 0) {
      setErrorAlert('Please select at least one roommate sharing this cost.')
      return
    }

    if (!calcResult.isValid) {
      setErrorAlert(calcResult.error || 'Please review your split shares.')
      return
    }

    const finalPayerId = payerId && payerId !== 'unpaid' && payerId !== 'nobody' ? Number(payerId) : null

    setSaving(true)
    try {
      await onSave({
        id: editExpense?.id,
        title: title.trim(),
        amount: numAmount,
        category,
        payer_id: finalPayerId,
        expense_date: expenseDate,
        split_type: splitType,
        notes: notes.trim(),
        receipt_url: receiptUrl.trim(),
        splits: calcResult.splits,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save expense:', err)
      setErrorAlert(err.message || 'Failed to save expense. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <i className="fa-solid fa-receipt text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editExpense ? 'Edit Shared Expense' : 'Add Shared Expense'}
              </h2>
              <p className="text-xs text-blue-100">Log a shared utility or bill for your flat</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Error Alert */}
          {errorAlert && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-shake">
              <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-500"></i>
              <div className="flex-1 font-medium">{errorAlert}</div>
            </div>
          )}

          {/* Title & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Expense Title <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. DESCO Electricity Bill, Wi-Fi 50Mbps"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Total Amount (৳) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Category & Payer & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Paid By <span className="text-red-500">*</span>
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium"
                required
              >
                <option value="unpaid" className="font-bold text-amber-700">
                  ⚠️ Nobody paid yet (Pending Bill to Pay)
                </option>
                <optgroup label="Roommate who paid:">
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.name} {m.id === currentUserId ? '(You)' : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Split Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Split Method
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSplitType(SPLIT_TYPES.EQUAL)}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  splitType === SPLIT_TYPES.EQUAL
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-equals text-[11px]"></i>
                Equal Split
              </button>
              <button
                type="button"
                onClick={() => setSplitType(SPLIT_TYPES.EXACT)}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  splitType === SPLIT_TYPES.EXACT
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-bangladeshi-taka-sign text-[11px]"></i>
                Exact Amounts
              </button>
              <button
                type="button"
                onClick={() => setSplitType(SPLIT_TYPES.PERCENTAGE)}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  splitType === SPLIT_TYPES.PERCENTAGE
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-percent text-[11px]"></i>
                Percentages
              </button>
            </div>
          </div>

          {/* Roommates Participant Selector & Share Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Split With ({selectedUserIds.length} of {members.length} roommates)
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedUserIds.length === members.length) {
                    setSelectedUserIds([Number(payerId) || members[0]?.id])
                  } else {
                    setSelectedUserIds(members.map((m) => m.id))
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {selectedUserIds.length === members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2">
              {members.map((member) => {
                const isSelected = selectedUserIds.includes(member.id)
                const splitItem = calcResult.splits.find((s) => s.userId === member.id)

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-white border-blue-200 shadow-sm'
                        : 'bg-slate-100/70 border-transparent opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 mr-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleParticipant(member.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center shrink-0">
                          {(member.full_name || member.name || '?')
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {member.full_name || member.name}
                          {member.id === Number(payerId) && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                              Payer
                            </span>
                          )}
                        </span>
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-2">
                        {splitType === SPLIT_TYPES.EQUAL && (
                          <span className="text-xs font-bold text-slate-700">
                            {formatBDT(splitItem?.amount || 0)}
                          </span>
                        )}

                        {splitType === SPLIT_TYPES.EXACT && (
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1.5 text-slate-400 text-xs">৳</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={exactValues[member.id] || ''}
                              onChange={(e) => handleCustomChange(member.id, e.target.value)}
                              className="w-full pl-6 pr-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                          </div>
                        )}

                        {splitType === SPLIT_TYPES.PERCENTAGE && (
                          <div className="relative w-24">
                            <input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={percentValues[member.id] || ''}
                              onChange={(e) => handleCustomChange(member.id, e.target.value)}
                              className="w-full pl-2 pr-6 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                            <span className="absolute right-2 top-1.5 text-slate-400 text-xs font-bold">%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Split validation status */}
            {!calcResult.isValid && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                <span>{calcResult.error}</span>
              </div>
            )}
            {calcResult.isValid && amount > 0 && (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check text-emerald-600"></i>
                  <span>Splits balance correctly ({formatBDT(amount)})</span>
                </span>
                <span className="font-bold">
                  {splitType === SPLIT_TYPES.EQUAL && `${formatBDT(amount / activeParticipants.length)} / person`}
                </span>
              </div>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes or Memo <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Month of August, paid via bKash TrxID #8X93"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !calcResult.isValid}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              {saving && <i className="fa-solid fa-circle-notch fa-spin"></i>}
              <span>{editExpense ? 'Update Expense' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
