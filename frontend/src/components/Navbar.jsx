import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import NotificationsBell from './NotificationsBell'

const Navbar = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled]           = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [roommateRequests, setRoommateRequests]     = useState([])    // pending received invites
  const [reqDropdownOpen, setReqDropdownOpen]       = useState(false)
  const [respondingId, setRespondingId]             = useState(null)
  const [rentNotifOpen, setRentNotifOpen]           = useState(false)
  const [rentNotifications, setRentNotifications]   = useState([])
  const [rentUnreadCount, setRentUnreadCount]       = useState(0)
  const [currentUser, setCurrentUser]     = useState(() =>
    JSON.parse(localStorage.getItem('ff_user') || 'null')
  )
  const menuRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // re-read user from localStorage when the tab regains focus (e.g. after login)
  useEffect(() => {
    const sync = () => setCurrentUser(JSON.parse(localStorage.getItem('ff_user') || 'null'))
    window.addEventListener('focus', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('focus', sync); window.removeEventListener('storage', sync) }
  }, [])

  // close the account dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    // Fetch bookmark notifications
    const userKey = localStorage.getItem('ff_user_key')
    if (userKey) {
      fetch(`http://localhost:8000/api/bookmarks?user_key=${userKey}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            const alerts = json.data.filter(item => item.rent_dropped || item.availability_changed)
            setNotificationCount(alerts.length)
          }
        })
        .catch(() => {})
    }

    // Fetch unread messages
    if (currentUser) {
      fetch(`http://localhost:8000/api/messages/conversations/${currentUser.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            const unread = data.data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
            setUnreadMessageCount(unread)
          }
        })
        .catch(() => {})
    }
  }, [currentUser?.id])

  // ── Poll for pending roommate requests (students only) ─────────────────────
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return
    const load = () => {
      fetch(`http://localhost:8000/api/roommates/my-group?user_id=${currentUser.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) setRoommateRequests(data.receivedInvites || [])
        })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 30_000) // refresh every 30 s
    return () => clearInterval(t)
  }, [currentUser?.id])

  // ── Poll for rent reminder notifications (students only) ────────────────────
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return
    const loadNotifs = () => {
      fetch(`http://localhost:8000/api/notifications?user_id=${currentUser.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setRentNotifications(data.data)
            setRentUnreadCount(data.unreadCount || 0)
          }
        })
        .catch(() => {})
    }
    loadNotifs()
    const t = setInterval(loadNotifs, 60_000) // refresh every 60 s
    return () => clearInterval(t)
  }, [currentUser?.id])

  async function respondToRequest(inviteId, action) {
    setRespondingId(inviteId)
    try {
      const r = await fetch('http://localhost:8000/api/roommates/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId, user_id: currentUser.id, action }),
      })
      const j = await r.json()
      if (j.success) {
        // Re-fetch so accepting auto-declines other invites too
        const res  = await fetch(`http://localhost:8000/api/roommates/my-group?user_id=${currentUser.id}`)
        const data = await res.json()
        if (data.success) setRoommateRequests(data.receivedInvites || [])
      }
    } catch {}
    setRespondingId(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('ff_user')
    setCurrentUser(null)
    setMenuOpen(false)
    navigate('/')
  }

  const firstName = currentUser?.full_name?.split(' ')[0] || 'You'
  const initials = currentUser?.full_name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  // role-specific dropdown links, defined once and reused for desktop + mobile
  const accountLinks = (() => {
    if (!currentUser) return []
    if (currentUser.role === 'landlord') {
      return [
        { to: '/post-listing', icon: 'fa-square-plus', label: 'Post Listing' },
        { to: `/landlord/${currentUser.id}/dashboard`, icon: 'fa-chart-line', label: 'Dashboard' },
        { to: `/landlord/${currentUser.id}`, icon: 'fa-id-card', label: 'My Profile' },
      ]
    }
    if (currentUser.role === 'student') {
      return [
        { to: '/roommate-profile', icon: 'fa-id-card', label: 'My Profile' },
        { to: '/my-tenancy', icon: 'fa-house-user', label: 'My Tenancy' },
        { to: '/bills', icon: 'fa-receipt', label: 'Shared Bills' },
        { to: '/meal-plans', icon: 'fa-utensils', label: 'Meal Plans' },
        { to: '/maintenance', icon: 'fa-wrench', label: 'Maintenance' },
        { to: '/rent-reminder', icon: 'fa-calendar-check', label: 'Rent Reminder' },
        { to: '/lifestyle-quiz', icon: 'fa-clipboard-list', label: 'Lifestyle Quiz' },
      ]
    }
    if (currentUser.role === 'admin') {
      return [{ to: '/admin', icon: 'fa-shield-halved', label: 'Admin Panel', accent: true }]
    }
    return []
  })()

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-slate-100 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center shadow-md group-hover:bg-blue-900 transition-colors">
              <i className="fa-solid fa-house-chimney text-white text-lg"></i>
            </div>
            <span className="text-lg font-bold text-blue-800 tracking-tight">
              flatfolks
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2 ml-8">
            <NavLink 
              to="/listings" 
              className={({isActive}) => `px-4 py-2 text-[14px] font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}
            >
              Browse Listings
            </NavLink>
            <NavLink 
              to="/roommates" 
              className={({isActive}) => `px-4 py-2 text-[14px] font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}
            >
              Find Roommates
            </NavLink>
            <NavLink 
              to="/compare" 
              className={({isActive}) => `flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}
            >
              <i className="fa-solid fa-scale-balanced text-xs"></i>
              Compare
            </NavLink>
            <NavLink 
              to="/maintenance" 
              className={({isActive}) => `flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}
            >
              <i className="fa-solid fa-screwdriver-wrench text-xs"></i>
              Maintenance
            </NavLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-1.5">

            {/* Watchlist */}
            <NavLink to="/watchlist" title="My Watchlist"
              className={({isActive}) => `hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
              <i className="fa-regular fa-bookmark"></i>
              <span className="hidden lg:inline">Watchlist</span>
            </NavLink>

            {/* Messages */}
            <NavLink to="/messages" title="Messages"
              className={({isActive}) => `relative flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
              <i className="fa-regular fa-message text-lg"></i>
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadMessageCount}
                </span>
              )}
            </NavLink>

            {/* ── Roommate Requests (students only) ── */}
            {currentUser?.role === 'student' && (
              <div className="relative">
                <button
                  onClick={() => setReqDropdownOpen(o => !o)}
                  title="Roommate Requests"
                  className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    reqDropdownOpen ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  <i className="fa-solid fa-user-group text-lg"></i>
                  {roommateRequests.length > 0 && (
                    <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {roommateRequests.length}
                    </span>
                  )}
                </button>

                {reqDropdownOpen && (
                  <>
                    {/* backdrop — click outside to close */}
                    <div className="fixed inset-0 z-40" onClick={() => setReqDropdownOpen(false)} />

                    <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

                      {/* Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">
                          <i className="fa-solid fa-user-group text-blue-600 mr-2"></i>
                          Roommate Requests
                        </h3>
                        {roommateRequests.length > 0 && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-50 text-red-600 rounded-full border border-red-100">
                            {roommateRequests.length} pending
                          </span>
                        )}
                      </div>

                      {/* Request list */}
                      {roommateRequests.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <i className="fa-solid fa-user-group text-slate-200 text-3xl mb-3"></i>
                          <p className="text-sm font-medium text-slate-400">No pending requests</p>
                          <p className="text-xs text-slate-300 mt-1">When someone sends you a roommate request it will appear here.</p>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                          {roommateRequests.map(req => (
                            <div key={req.id} className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                                  {(req.inviter_name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{req.inviter_name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Invited you to join <span className="font-medium text-slate-700">{req.group_name || 'their group'}</span>
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    <i className="fa-solid fa-people-group mr-1"></i>{req.member_count}/4 members
                                  </p>
                                </div>
                              </div>

                              {req.message && (
                                <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2 mb-3">
                                  “{req.message}”
                                </p>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => respondToRequest(req.id, 'ACCEPTED')}
                                  disabled={respondingId === req.id}
                                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {respondingId === req.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Accept'}
                                </button>
                                <button
                                  onClick={() => respondToRequest(req.id, 'DECLINED')}
                                  disabled={respondingId === req.id}
                                  className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                        <Link
                          to="/roommate-profile"
                          onClick={() => setReqDropdownOpen(false)}
                          className="block text-center text-xs text-blue-700 hover:underline font-medium"
                        >
                          View full group dashboard →
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Rent Reminder Notification Bell (students only) ── */}
            {currentUser?.role === 'student' && (
              <div className="relative">
                <button
                  onClick={() => setRentNotifOpen(o => !o)}
                  title="Rent Reminders"
                  className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    rentNotifOpen ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  <i className="fa-regular fa-bell text-lg" />
                  {rentUnreadCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {rentUnreadCount}
                    </span>
                  )}
                </button>

                {rentNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setRentNotifOpen(false)} />
                    <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">
                          <i className="fa-solid fa-bell text-amber-500 mr-2" />
                          Rent Reminders
                        </h3>
                        {rentUnreadCount > 0 && (
                          <button
                            className="text-xs text-blue-600 hover:underline font-semibold"
                            onClick={() => {
                              fetch('http://localhost:8000/api/notifications/read-all', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: currentUser.id }),
                              }).then(() => {
                                setRentNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
                                setRentUnreadCount(0)
                              }).catch(() => {})
                            }}
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notification list */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {rentNotifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <i className="fa-regular fa-bell-slash text-slate-200 text-3xl mb-3" />
                            <p className="text-sm font-medium text-slate-400">No reminders yet</p>
                            <p className="text-xs text-slate-300 mt-1">Set your rent due date to receive reminders.</p>
                          </div>
                        ) : (
                          rentNotifications.slice(0, 8).map(n => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 flex items-start gap-3 ${n.is_read ? '' : 'bg-blue-50'}`}
                            >
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-slate-200' : 'bg-blue-500'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {new Date(n.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                              {!n.is_read && (
                                <button
                                  onClick={() => {
                                    fetch(`http://localhost:8000/api/notifications/${n.id}/read`, { method: 'PATCH' })
                                      .then(() => {
                                        setRentNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x))
                                        setRentUnreadCount(c => Math.max(0, c - 1))
                                      }).catch(() => {})
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline font-semibold shrink-0"
                                >
                                  Read
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                        <Link
                          to="/rent-reminder"
                          onClick={() => setRentNotifOpen(false)}
                          className="block text-center text-xs text-blue-700 hover:underline font-medium"
                        >
                          Manage rent reminder settings →
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

                        {/* General notifications (payments received/sent, etc.) — every logged-in role, polls every 8s */}
            {currentUser && (
              <div className="hidden sm:block">
                <NotificationsBell currentUser={currentUser} />
              </div>
            )}

            {/* Auth area */}
            {currentUser ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 ml-2 rounded-full border transition-all ${
                    menuOpen ? 'bg-blue-50 border-blue-100' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </span>
                  <span className="hidden sm:block text-sm font-medium text-slate-700">{firstName}</span>
                  <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 overflow-hidden">
                    <div className="px-3.5 py-2 mb-1 border-b border-slate-50">
                      <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.full_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{currentUser.role} account</p>
                    </div>

                    {accountLinks.map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors ${
                          link.accent ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <i className={`fa-solid ${link.icon} w-4 text-center text-[13px]`}></i>
                        {link.label}
                      </Link>
                    ))}

                    <div className="my-1.5 border-t border-slate-50"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center text-[13px]"></i>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <NavLink to="/signin" className={({isActive}) => `hidden sm:block px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
                  Sign In
                </NavLink>
                <Link to="/get-started" className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-xl transition-all shadow-md hover:shadow-lg">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden"><i className="fa-solid fa-arrow-right"></i></span>
                </Link>
              </>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-blue-50 rounded-lg transition-all">
              <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}></i>
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-blue-50 bg-white px-4 py-3 space-y-1">
          <Link to="/listings" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
            Browse Listings
          </Link>
          <Link to="/roommates" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
            Find Roommates
          </Link>
          <Link to="/compare" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
            <i className="fa-solid fa-scale-balanced mr-2"></i>Compare Properties
          </Link>
          <Link to="/maintenance" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
            <i className="fa-solid fa-screwdriver-wrench mr-2"></i>Maintenance
          </Link>

          <div className="my-2 border-t border-slate-100"></div>

          <Link to="/watchlist"
            className="block px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg">
            <i className="fa-regular fa-bookmark mr-2"></i>My Watchlist
          </Link>
          <Link to="/messages"
            className="block px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg">
            <i className="fa-regular fa-message mr-2"></i>Messages
          </Link>

          {currentUser ? (
            <>
              <div className="my-2 border-t border-slate-100"></div>
              <div className="px-4 py-1.5">
                <p className="text-sm font-semibold text-slate-800">{currentUser.full_name}</p>
                <p className="text-xs text-slate-400 capitalize">{currentUser.role} account</p>
              </div>
              {accountLinks.map(link => (
                <Link key={link.to} to={link.to}
                  className={`block px-4 py-2.5 text-sm font-medium rounded-lg ${
                    link.accent ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-700 hover:bg-blue-50'
                  }`}>
                  <i className={`fa-solid ${link.icon} w-4 text-center mr-2`}></i>{link.label}
                </Link>
              ))}
              {currentUser.role === 'student' && (
                <button
                  onClick={() => { setMobileOpen(false); setReqDropdownOpen(true) }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 rounded-lg"
                >
                  <i className="fa-solid fa-user-group w-4 text-center mr-2"></i>
                  Roommate Requests
                  {roommateRequests.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">{roommateRequests.length}</span>
                  )}
                </button>
              )}
              <button onClick={handleLogout}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i>Log Out
              </button>
            </>
          ) : (
            <>
              <div className="my-2 border-t border-slate-100"></div>
              <Link to="/signin" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 rounded-lg">
                Sign In
              </Link>
              <Link to="/get-started" className="block px-4 py-2.5 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg">
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar