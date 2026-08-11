const roommates = [
  {
    initial: 'R', name: 'Rania Islam', dept: 'CSE · BRACU',
    desc: 'Night owl · Clean · Quiet study · No guests',
    match: 94, gradient: 'from-blue-400 to-blue-700', connected: true,
  },
  {
    initial: 'T', name: 'Tahmid Hasan', dept: 'EEE · NSU',
    desc: 'Early riser · Moderate · Social · Non-smoker',
    match: 87, gradient: 'from-indigo-400 to-purple-600', connected: false,
  },
  {
    initial: 'N', name: 'Nusrat Jahan', dept: 'BBA · IUB',
    desc: 'Flexible · Tidy · Quiet evenings · Non-smoker',
    match: 81, gradient: 'from-teal-400 to-blue-600', connected: false,
  },
]

const RoommateMatch = () => {
  return (
    <section id="roommates" className="py-24 bg-blue-950 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"
        style={{ background: 'rgba(30,64,175,0.2)' }}></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"
        style={{ background: 'rgba(59,130,246,0.1)' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Text */}
          <div>
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-4">Smart Matching</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
              Find Roommates Who<br /><span className="text-blue-300">Actually Vibe With You</span>
            </h2>
            <p className="text-blue-300 text-lg leading-relaxed mb-8">
              Our lifestyle compatibility quiz covers sleep schedule, cleanliness, noise tolerance, study habits,
              and more — generating a real match score so you live with the right people.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                'Compatibility quiz across 6 lifestyle dimensions',
                'Smart match feed sorted by % compatibility, not just location',
                'Form groups of 2–4 to search for a flat together as a unit',
                'Send & accept roommate requests before committing to a flat',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(59,130,246,0.2)' }}>
                    <i className="fa-solid fa-check text-blue-400 text-xs"></i>
                  </div>
                  <p className="text-blue-200 text-sm leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
            <a href="#" className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg">
              Take the Compatibility Quiz <i className="fa-solid fa-arrow-right text-sm"></i>
            </a>
          </div>

          {/* Right: Roommate Cards */}
          <div className="space-y-4">
            {roommates.map((r, i) => (
              <div key={i}
                className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 bg-gradient-to-br ${r.gradient} flex items-center justify-center`}>
                  <span className="text-2xl font-black text-white">{r.initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-white text-sm">{r.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full text-blue-300"
                      style={{ background: 'rgba(59,130,246,0.3)' }}>{r.dept}</span>
                  </div>
                  <p className="text-blue-300 text-xs mb-2.5">{r.desc}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-1000"
                        style={{ width: `${r.match}%` }}></div>
                    </div>
                    <span className="text-xs font-black text-emerald-400 flex-shrink-0">{r.match}% Match</span>
                  </div>
                </div>
                <button className={`flex-shrink-0 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-all ${
                  r.connected ? 'bg-blue-500 hover:bg-blue-600' : 'hover:bg-blue-500 border border-white/20'
                }`} style={!r.connected ? { background: 'rgba(255,255,255,0.15)' } : {}}>
                  Connect
                </button>
              </div>
            ))}
            <div className="text-center pt-2">
              <a href="#" className="text-blue-300 text-sm font-semibold hover:text-blue-200 transition-colors">
                View all compatible roommates →
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default RoommateMatch
