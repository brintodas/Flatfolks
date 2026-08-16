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

        </div>
      </div>
    </section>
  )
}

export default RoommateMatch
