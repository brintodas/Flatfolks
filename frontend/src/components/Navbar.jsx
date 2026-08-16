import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const Navbar = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled]           = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
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
      return [{ to: '/roommate-profile', icon: 'fa-id-card', label: 'My Profile' }]
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
              className={({isActive}) => `relative hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
              <i className="fa-regular fa-message text-lg"></i>
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadMessageCount}
                </span>
              )}
            </NavLink>

            {/* Notification bell */}
            {currentUser?.role !== 'landlord' && (
              <NavLink to="/watchlist" title="Notifications"
                className={({isActive}) => `relative hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isActive ? 'bg-blue-800 text-white shadow-sm' : 'text-blue-800 hover:text-blue-900 hover:bg-blue-50'}`}>
                <i className="fa-regular fa-bell text-lg"></i>
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                    {notificationCount}
                  </span>
                )}
              </NavLink>
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
                  <i className={`fa-solid ${link.icon} mr-2`}></i>{link.label}
                </Link>
              ))}
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
