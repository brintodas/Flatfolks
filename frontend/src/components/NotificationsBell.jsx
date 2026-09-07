/**
 * components/NotificationsBell.jsx
 * Polls /api/notifications/:userId every 8s — same pattern as the
 * existing roommate-request polling in Navbar.jsx. This is what makes
 * a landlord's rent-payment notification feel "instant" without adding
 * a websocket dependency to the project.
 *
 * Clicking a notification marks it read and routes the user to wherever
 * they need to go next — most importantly, straight into the Payments
 * gateway when an advance deposit or maintenance payment is due.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const POLL_MS = 8000

// Types that mean "you owe money" — these get a "Pay Now" chip and route
// straight into the Payments portal, where the due item is already
// computed live server-side (no query params needed).
const ACTIONABLE_TYPES = new Set(['advance_payment', 'maintenance_payment'])

const TYPE_META = {
  payment_received: { icon: 'fa-sack-dollar', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  payment_sent: { icon: 'fa-circle-check', color: 'text-blue-600', bg: 'bg-blue-50' },
  payment_failed: { icon: 'fa-circle-exclamation', color: 'text-red-600', bg: 'bg-red-50' },
  advance_payment: { icon: 'fa-key', color: 'text-amber-600', bg: 'bg-amber-50' },
  maintenance_payment: { icon: 'fa-wrench', color: 'text-amber-600', bg: 'bg-amber-50' },
  system: { icon: 'fa-bell', color: 'text-slate-500', bg: 'bg-slate-100' },
}

function metaFor(type) {
  return TYPE_META[type] || TYPE_META.system
}

const NotificationsBell = ({ currentUser }) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (!currentUser?.id) return
    const load = () => {
      // No `type` filter here — we want every notification type
      // (payment_received, payment_sent, advance_payment, maintenance_payment,
      // system...). Rent reminders have their own dedicated bell elsewhere in
      // the navbar, so we filter those out client-side to avoid double alerts.
      fetch(`http://localhost:8000/api/notifications/${currentUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const rest = (data.data || []).filter((n) => n.type !== 'rent_reminder')
            setItems(rest)
            const unread = rest.filter((n) => !n.is_read).length
            setUnreadCount(data.unread_count ?? unread)
          }
        })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [currentUser?.id])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    fetch(`http://localhost:8000/api/notifications/${id}/read`, { method: 'PUT' }).catch(() => {})
  }

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
    setUnreadCount(0)
    fetch('http://localhost:8000/api/notifications/mark-all-read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id }),
    }).catch(() => {})
  }

  // Decide where a click on a notification should take the user.
  const routeFor = (n) => {
    const isLandlord = currentUser?.role === 'landlord'

    if (ACTIONABLE_TYPES.has(n.type)) return '/payments'

    if (n.related_type === 'tenancy') {
      return isLandlord ? `/landlord/${currentUser.id}/dashboard` : '/my-tenancy'
    }
    if (n.related_type === 'maintenance') {
      return '/maintenance'
    }
    if (n.related_type === 'rent_payment') {
      return isLandlord ? `/landlord/${currentUser.id}/dashboard` : '/payments'
    }
    return isLandlord ? `/landlord/${currentUser.id}/dashboard` : '/my-applications'
  }

  const handleNotifClick = (n) => {
    if (!n.is_read) markRead(n.id)
    setOpen(false)
    navigate(routeFor(n))
  }

  if (!currentUser) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
          open ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'
        }`}
      >
        <i className="fa-regular fa-bell text-lg"></i>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-lg py-1.5">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-50">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-blue-700 hover:text-blue-900">
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-3.5 py-6 text-sm text-slate-400 text-center">No notifications yet</p>
          ) : (
            items.map((n) => {
              const meta = metaFor(n.type)
              const actionable = ACTIONABLE_TYPES.has(n.type)
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-3.5 py-2.5 border-b border-slate-50 last:border-0 transition-colors ${
                    n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <i className={`fa-solid ${meta.icon} ${meta.color} text-[11px]`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-700 shrink-0"></span>}
                        <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                      </div>
                      {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                        {actionable && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Pay Now →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell