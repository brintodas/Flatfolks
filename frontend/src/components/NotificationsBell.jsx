/**
 * components/NotificationsBell.jsx
 * Polls /api/notifications/:userId every 8s — same pattern as the
 * existing roommate-request polling in Navbar.jsx. This is what makes
 * a landlord's rent-payment notification feel "instant" without adding
 * a websocket dependency to the project.
 */
import { useState, useEffect, useRef } from 'react'

const POLL_MS = 8000

const NotificationsBell = ({ currentUser }) => {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (!currentUser?.id) return
    const load = () => {
      fetch(`http://localhost:8000/api/notifications/${currentUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setItems(data.data)
            setUnreadCount(data.unread_count)
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
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-3.5 py-2.5 border-b border-slate-50 last:border-0 transition-colors ${
                  n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-700 shrink-0"></span>}
                  <div className={!n.is_read ? '' : 'pl-3.5'}>
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell