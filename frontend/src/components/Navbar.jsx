import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const Navbar = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled]           = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
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
                <Link to="/roommate-profile" className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 rounded-lg">
                  My Profile
                </Link>
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

