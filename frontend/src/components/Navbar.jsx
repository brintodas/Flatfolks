import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 border-b border-blue-50 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}
      style={{ backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center shadow-md group-hover:bg-blue-900 transition-colors">
              <i className="fa-solid fa-house-chimney text-white text-lg"></i>
            </div>
            <span className="text-xl font-black text-blue-900 tracking-tight">
              Flat<span className="text-blue-600">folks</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {['Browse Listings', 'Find Roommates', 'How It Works', 'For Landlords'].map((item, i) => (
              <a key={i} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
                {item}
              </a>
            ))}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-2.5">

            {/* Watchlist icon – FR#4 */}
            <Link to="/watchlist" title="My Watchlist"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              <i className="fa-regular fa-bookmark"></i>
              <span className="hidden lg:inline">Watchlist</span>
            </Link>

            <a href="#" className="hidden sm:block px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
              Sign In
            </a>
            <a href="#" className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-md hover:shadow-lg">
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden"><i className="fa-solid fa-arrow-right"></i></span>
            </a>
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
          {['Browse Listings', 'Find Roommates', 'How It Works', 'For Landlords'].map((item, i) => (
            <a key={i} href="#"
              className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
              {item}
            </a>
          ))}
          <Link to="/watchlist"
            className="block px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg">
            <i className="fa-regular fa-bookmark mr-2"></i>My Watchlist
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar
