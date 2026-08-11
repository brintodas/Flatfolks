import { useState } from 'react'

const HeroSection = () => {
  const [activeTab, setActiveTab] = useState('rent')

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

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
          style={{ background: 'linear-gradient(135deg, rgba(15,32,68,0.82) 0%, rgba(30,64,175,0.62) 55%, rgba(59,130,246,0.25) 100%)' }}>
        </div>
      </div>

      {/* Floating Verified Badge */}
      <div className="absolute top-32 right-16 hidden lg:block z-10"
        style={{ animation: 'float 3s ease-in-out infinite' }}>
        <div className="bg-white/95 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3"
          style={{ backdropFilter: 'blur(8px)' }}>
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-shield-check text-green-600"></i>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Verified Listing</p>
            <p className="text-sm font-bold text-slate-800">2-BHK · Dhanmondi</p>
          </div>
        </div>
      </div>

      {/* Floating Match Badge */}
      <div className="absolute bottom-40 right-8 hidden lg:block z-10"
        style={{ animation: 'float 3.5s ease-in-out infinite', animationDelay: '0.5s' }}>
        <div className="bg-white/95 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3"
          style={{ backdropFilter: 'blur(8px)' }}>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-users text-blue-600"></i>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Roommate Match</p>
            <p className="text-sm font-bold text-slate-800">94% Compatible 🎯</p>
          </div>
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-blue-200 text-sm font-medium mb-6"
          style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(147,197,253,0.4)', backdropFilter: 'blur(8px)' }}>
          <span className="w-1.5 h-1.5 bg-blue-300 rounded-full inline-block animate-pulse"></span>
          Bangladesh's #1 Student Housing Platform
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6">
          Find Your Perfect<br />
          <span className="text-blue-300">Student Home.</span>
        </h1>

        <p className="text-lg sm:text-xl text-blue-100/90 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
          Verified listings, smart roommate matching, and move-in support — all in one place built for university students.
        </p>

        {/* Search Widget */}
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[
              { id: 'rent', label: 'Rent a Place', icon: 'fa-building' },
              { id: 'roommate', label: 'Find Roommates', icon: 'fa-user-group' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all border ${
                  activeTab === tab.id
                    ? 'bg-blue-800 text-white shadow-lg border-blue-800'
                    : 'text-white border-white/30 hover:bg-white/20'
                }`}
                style={{ backdropFilter: 'blur(8px)', background: activeTab !== tab.id ? 'rgba(255,255,255,0.15)' : '' }}>
                <i className={`fa-solid ${tab.icon} mr-2`}></i>{tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-2xl p-2.5 flex flex-col lg:flex-row items-stretch gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-all">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-location-dot text-blue-600 text-sm"></i>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</p>
                <input type="text" placeholder="Near your university..."
                  className="text-sm font-medium text-slate-700 bg-transparent outline-none w-full placeholder-slate-400" />
              </div>
            </div>

            <div className="hidden lg:block w-px bg-slate-100 self-stretch my-1"></div>

            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-all">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-calendar-days text-blue-600 text-sm"></i>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Move-in</p>
                <input type="text" placeholder="Select date..."
                  className="text-sm font-medium text-slate-700 bg-transparent outline-none w-full placeholder-slate-400" />
              </div>
            </div>

            <div className="hidden lg:block w-px bg-slate-100 self-stretch my-1"></div>

            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-all">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-tag text-blue-600 text-sm"></i>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Budget</p>
                <input type="text" placeholder="Monthly rent..."
                  className="text-sm font-medium text-slate-700 bg-transparent outline-none w-full placeholder-slate-400" />
              </div>
            </div>

            <button className="flex-shrink-0 px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 justify-center">
              <i className="fa-solid fa-magnifying-glass"></i>
              <span>Search</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="text-blue-200/80 text-sm font-medium">Popular:</span>
            {['Near BRACU', 'Furnished', 'Bills Included', 'Girls Only', 'Under ৳10,000'].map((tag, i) => (
              <button key={i}
                className="px-3 py-1 text-white text-xs font-medium rounded-full transition-all hover:bg-white/25"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 animate-bounce">
        <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
        <i className="fa-solid fa-chevron-down text-sm"></i>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </section>
  )
}

export default HeroSection
