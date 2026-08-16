import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const Navbar = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled]           = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [notificationCount, setNotificationCount]   = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [roommateRequests, setRoommateRequests]     = useState([])    // pending received invites
  const [reqDropdownOpen, setReqDropdownOpen]       = useState(false)
  const [respondingId, setRespondingId]             = useState(null)
  const [currentUser, setCurrentUser]     = useState(() =>
    JSON.parse(localStorage.getItem('ff_user') || 'null')
  )

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
    navigate('/')
  }

  // first name only for greeting
  const firstName = currentUser?.full_name?.split(' ')[0] || 'You'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-slate-100 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-sm shadow-blue-700/20 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-house-chimney text-xs"></i>
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
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2.5">

            {/* Watchlist */}
            <NavLink to="/watchlist" title="My Watchlist"
              className={({isActive}) => `hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
              <i className="fa-regular fa-bookmark"></i>
              <span className="hidden lg:inline">Watchlist</span>
            </NavLink>

            {/* Messages */}
            <NavLink to="/messages" title="Messages"
              className={({isActive}) => `relative hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
              <i className="fa-regular fa-message text-lg"></i>
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadMessageCount}
                </span>
              )}
            </NavLink>

            {/* ── Roommate Requests (students only) ── */}
            {currentUser?.role === 'student' && (
              <div className="relative hidden sm:block">
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

            {/* Notification bell */}
            <NavLink to="/watchlist" title="Notifications"
              className={({isActive}) => `relative hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
              <i className="fa-regular fa-bell text-lg"></i>
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {notificationCount}
                </span>
              )}
            </NavLink>

            {/* Auth area — changes based on login state */}
            {currentUser ? (
              <>
                {/* Landlord-only: Post Listing */}
                {currentUser.role === 'landlord' && (
                  <NavLink to="/post-listing"
                    className={({isActive}) => `hidden sm:block px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
                    Post Listing
                  </NavLink>
                )}
                {/* Student-only: My Profile */}
                {currentUser.role === 'student' && (
                  <NavLink to="/roommate-profile"
                    className={({isActive}) => `hidden sm:block px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
                    My Profile
                  </NavLink>
                )}
                {/* Admin-only: Dashboard */}
                {currentUser.role === 'admin' && (
                  <NavLink to="/admin"
                    className={({isActive}) => `hidden sm:block px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
                    <i className="fa-solid fa-shield-halved mr-1"></i>Admin Panel
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-all text-blue-800 hover:text-blue-900 hover:bg-blue-50">
                  Log Out
                </button>
              </>
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
              {currentUser.role === 'student' && (
                <>
                  <Link to="/roommate-profile" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 rounded-lg">
                    My Profile
                  </Link>
                  <button
                    onClick={() => { setMobileOpen(false); setReqDropdownOpen(true) }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 rounded-lg"
                  >
                    <i className="fa-solid fa-user-group text-blue-600"></i>
                    Roommate Requests
                    {roommateRequests.length > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">{roommateRequests.length}</span>
                    )}
                  </button>
                </>
              )}
              {currentUser.role === 'landlord' && (
                <Link to="/post-listing" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 rounded-lg">
                  Post Listing
                </Link>
              )}
              {currentUser.role === 'admin' && (
                <Link to="/admin" className="block px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg">
                  <i className="fa-solid fa-shield-halved mr-2"></i>Admin Panel
                </Link>
              )}
              <button onClick={handleLogout}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                Log Out
              </button>
            </>
          ) : (
            <>
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

