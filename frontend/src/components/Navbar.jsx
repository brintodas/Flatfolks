import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 border-b border-blue-50 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}
      style={{ backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center shadow-md group-hover:bg-blue-900 transition-colors">
              <i className="fa-solid fa-house-chimney text-white text-lg"></i>
            </div>
            <span className="text-xl font-black text-blue-900 tracking-tight">
              Flat<span className="text-blue-600">folks</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/listings" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              Browse Listings
            </Link>
            <Link to="/roommates" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              Find Roommates
            </Link>
            {['How It Works', 'For Landlords'].map((item, i) => (
              <a key={i} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
                {item}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2.5">

            {/* Watchlist */}
            <Link to="/watchlist" title="My Watchlist"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              <i className="fa-regular fa-bookmark"></i>
              <span className="hidden lg:inline">Watchlist</span>
            </Link>

            {/* Messages */}
            <Link to="/messages" title="Messages"
              className="relative hidden sm:flex items-center justify-center w-10 h-10 text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              <i className="fa-regular fa-message text-lg"></i>
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadMessageCount}
                </span>
              )}
            </Link>

            {/* Notification bell */}
            <Link to="/watchlist" title="Notifications"
              className="relative hidden sm:flex items-center justify-center w-10 h-10 text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              <i className="fa-regular fa-bell text-lg"></i>
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {notificationCount}
                </span>
              )}
            </Link>

            {/* Auth area — changes based on login state */}
            {currentUser ? (
              <>
                {/* Landlord-only: Post Listing */}
                {currentUser.role === 'landlord' && (
                  <Link to="/post-listing"
                    className="hidden sm:block px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
                    Post Listing
                  </Link>
                )}
                {/* Student-only: My Profile */}
                {currentUser.role === 'student' && (
                  <Link to="/roommate-profile"
                    className="hidden sm:block px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
                    My Profile
                  </Link>
                )}
                <span className="hidden sm:block text-sm text-slate-500">Hi, {firstName}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="hidden sm:block px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
                  Sign In
                </Link>
                <Link to="/get-started" className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-md hover:shadow-lg">
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
          {['How It Works', 'For Landlords'].map((item, i) => (
            <a key={i} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
              {item}
            </a>
          ))}
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
              <Link to="/get-started" className="block px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg">
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

