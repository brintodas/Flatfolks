import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
  const navigate = useNavigate()
  const [locationStr, setLocationStr] = useState('')
  const [moveIn, setMoveIn] = useState('')
  const [budget, setBudget] = useState('')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (locationStr) params.set('search', locationStr)
    if (budget) params.set('max_rent', budget)
    if (moveIn) params.set('available_before', moveIn)
    navigate(`/listings?${params.toString()}`)
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1800&q=80"
          alt="Student apartment"
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            e.target.parentElement.style.background = 'linear-gradient(135deg,#0f2044 0%,#1e40af 60%,#3b82f6 100%)'
            e.target.style.display = 'none'
          }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(8,18,45,0.88) 0%, rgba(8,18,45,0.7) 55%, rgba(8,18,45,0.25) 100%)' }}>
        </div>
      </div>

      {/* Split layout */}
      <div className="relative z-10 w-full px-6 sm:px-10 flex flex-col lg:flex-row items-center gap-16 pt-24 pb-16">

        {/* Left — Search */}
        <div className="w-full lg:w-[45%] flex flex-col gap-3">

          {/* Stacked search fields */}
          <div className="w-full bg-white/95 rounded-2xl shadow-2xl overflow-hidden">
            {/* Location */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-all">
              <i className="fa-solid fa-location-dot text-blue-500 w-4 flex-shrink-0"></i>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Location</p>
                <input
                  type="text"
                  placeholder="Area, university or district..."
                  value={locationStr}
                  onChange={e => setLocationStr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="text-sm font-medium text-slate-700 bg-transparent outline-none w-full placeholder-slate-400"
                />
              </div>
            </div>

            {/* Move-in */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-all">
              <i className="fa-solid fa-calendar-days text-blue-500 w-4 flex-shrink-0"></i>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Move-in date</p>
                <input
                  type="date"
                  value={moveIn}
                  onChange={e => setMoveIn(e.target.value)}
                  className="text-sm font-medium text-slate-700 bg-transparent outline-none w-full"
                />
              </div>
            </div>

            {/* Budget */}
            <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-all">
              <i className="fa-solid fa-tag text-blue-500 w-4 flex-shrink-0"></i>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Max budget (৳/mo)</p>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="text-sm font-medium text-slate-700 bg-transparent outline-none w-full placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all flex items-center gap-2 justify-center text-base">
            <i className="fa-solid fa-magnifying-glass"></i>
            Search Listings
          </button>

          {/* Ghost action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/post-listing')}
              className="flex-1 py-3 text-sm font-semibold rounded-xl border border-white/30 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              style={{ backdropFilter: 'blur(8px)' }}>
              <i className="fa-solid fa-building"></i>Rent a Place
            </button>
            <button
              onClick={() => navigate('/roommates')}
              className="flex-1 py-3 text-sm font-semibold rounded-xl border border-white/30 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              style={{ backdropFilter: 'blur(8px)' }}>
              <i className="fa-solid fa-user-group"></i>Find Roommates
            </button>
          </div>
        </div>

        {/* Right — Tagline (pinned to right edge) */}
        <div className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2 text-right">
          <h1 className="text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight text-white">
            Most<br />
            Reliable Way<br />
            to Find Your<br />
            <span className="text-white">Rooms &amp;</span><br />
            Roommates.
          </h1>
        </div>

      </div>
    </section>
  )
}

export default HeroSection
