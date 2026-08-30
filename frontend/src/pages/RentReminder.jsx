import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API = 'http://localhost:8000/api'

const TYPE_LABELS = {
  rent_reminder_7d: '7 days before',
  rent_reminder_3d: '3 days before',
  rent_reminder_1d: '1 day before',
}

function RentReminder() {
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const [reminder, setReminder]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [dueDay, setDueDay]         = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notifsLoading, setNotifsLoading] = useState(true)
  const [toast, setToast]           = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load existing reminder setting
  useEffect(() => {
    if (!currentUser) return
    fetch(`${API}/reminders/${currentUser.id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.reminder) {
          setReminder(json.reminder)
          setDueDay(String(json.reminder.due_day))
          setRentAmount(json.reminder.rent_amount ? String(json.reminder.rent_amount) : '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser?.id])

  // Load notifications for this user
  useEffect(() => {
    if (!currentUser) return
    fetch(`${API}/notifications?user_id=${currentUser.id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setNotifications(json.data)
      })
      .catch(() => {})
      .finally(() => setNotifsLoading(false))
  }, [currentUser?.id])

  function handleSave(e) {
    e.preventDefault()
    if (!dueDay) return showToast('Please pick a due day.', 'error')
    setSaving(true)
    fetch(`${API}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:     currentUser.id,
        due_day:     parseInt(dueDay, 10),
        rent_amount: rentAmount ? parseFloat(rentAmount) : null,
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setReminder(json.reminder)
          showToast('Reminder saved! You\'ll be notified 7, 3, and 1 day before your due date.')
        } else {
          showToast(json.message || 'Failed to save.', 'error')
        }
      })
      .catch(() => showToast('Network error.', 'error'))
      .finally(() => setSaving(false))
  }

  function handleDisable() {
    if (!reminder) return
    if (!window.confirm('Disable your rent reminder?')) return
    fetch(`${API}/reminders/${currentUser.id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setReminder(prev => ({ ...prev, is_active: 0 }))
          showToast('Reminder disabled.')
        }
      })
      .catch(() => {})
  }

  function handleMarkAllRead() {
    fetch(`${API}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
        }
      })
      .catch(() => {})
  }

  function handleMarkRead(id) {
    fetch(`${API}/notifications/${id}/read`, { method: 'PATCH' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
        }
      })
      .catch(() => {})
  }

  function handleDeleteNotif(id) {
    fetch(`${API}/notifications/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setNotifications(prev => prev.filter(n => n.id !== id))
        }
      })
      .catch(() => {})
  }

  // — Auth guard —
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-lock text-slate-300 text-4xl mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Sign in required</h2>
          <p className="text-slate-500 text-sm mb-6">You need to be signed in as a student.</p>
          <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">Sign In</Link>
        </div>
      </div>
    )
  }
  if (currentUser.role !== 'student') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-triangle-exclamation text-amber-400 text-4xl mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Students only</h2>
          <p className="text-slate-500 text-sm">Rent reminders are for students only.</p>
        </div>
      </div>
    )
  }

  const isActive = reminder?.is_active === 1

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <i className="fa-regular fa-calendar-check text-blue-600" />
            Rent Reminder
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Set your monthly rent due date and receive automatic reminders 7, 3, and 1 day before it hits.
          </p>
        </div>

        {/* Status badge */}
        {!loading && reminder && (
          <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-fit
            ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isActive ? `Active — due on the ${reminder.due_day}${ordinal(reminder.due_day)} of each month` : 'Reminder disabled'}
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <i className="fa-solid fa-pen-to-square text-blue-500 text-sm" />
            {reminder ? 'Update your reminder' : 'Set up a reminder'}
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Due day */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Rent due day <span className="text-red-500">*</span>
              </label>
              <select
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              >
                <option value="">— Pick a day (1–31) —</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    {d}{ordinal(d)} of the month
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                If the month has fewer days (e.g. February), the reminder fires on the last day of that month.
              </p>
            </div>

            {/* Rent amount (optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Monthly rent amount <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rentAmount}
                  onChange={e => setRentAmount(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Shown in your reminder message for reference.</p>
            </div>

            {/* What you'll receive */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">You'll receive reminders</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-center gap-2"><i className="fa-solid fa-bell text-blue-500 text-xs" /> 7 days before your due date</li>
                <li className="flex items-center gap-2"><i className="fa-solid fa-bell text-blue-500 text-xs" /> 3 days before your due date</li>
                <li className="flex items-center gap-2"><i className="fa-solid fa-bell text-blue-600 text-xs" /> 1 day before your due date</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : isActive ? 'Update Reminder' : 'Enable Reminder'}
              </button>
              {isActive && (
                <button
                  type="button"
                  onClick={handleDisable}
                  className="px-5 border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Disable
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Notifications history */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-bell text-amber-500 text-sm" />
              Reminder History
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {notifications.filter(n => !n.is_read).length} new
                </span>
              )}
            </h2>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifsLoading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <i className="fa-regular fa-bell-slash text-slate-200 text-3xl mb-3" />
              <p className="text-sm text-slate-400">No reminders yet. Set a due date above to get started.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map(n => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors
                    ${n.is_read ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100'}`}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-slate-400">
                        {TYPE_LABELS[n.type] || n.type} · {new Date(n.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                      >
                        Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotif(n.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors ml-1"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export default RentReminder
