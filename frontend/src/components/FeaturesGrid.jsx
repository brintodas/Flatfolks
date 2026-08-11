const features = [
  { icon: 'fa-map-location-dot', title: 'Interactive Map View',    desc: 'Browse listings on a map showing distance to campus gates, bus stops, and nearby amenities.', highlight: true },
  { icon: 'fa-video',            title: '360° Virtual Tours',       desc: 'Landlords can post rich media — photos, video tours, floor plans, and 360° walkthroughs.' },
  { icon: 'fa-comments',         title: 'In-App Messaging',         desc: 'Communicate with landlords or roommates securely without sharing personal phone numbers.' },
  { icon: 'fa-file-signature',   title: 'Digital Lease Signing',    desc: 'Read, annotate, and digitally sign lease agreements within the platform — no printing needed.' },
  { icon: 'fa-scale-balanced',   title: 'Fair Rent Calculator',     desc: 'Auto-calculates each roommate\'s fair share based on room size and amenity access.' },
  { icon: 'fa-toolbox',          title: 'Move-In Support',          desc: 'Book electricians, plumbers, AC technicians, meal plans, and utility connections on-call.', highlight: true },
]

const FeaturesGrid = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Everything You Need</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Built for Student Life</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            Flatfolks handles everything from finding a listing to splitting bills — all in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <div key={i}
              className={`group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                feat.highlight
                  ? 'bg-blue-50 border-blue-100'
                  : 'bg-slate-50 border-slate-100'
              } hover:shadow-xl`}>
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4 text-xl transition-all duration-300 group-hover:bg-blue-800 group-hover:text-white">
                <i className={`fa-solid ${feat.icon}`}></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{feat.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default FeaturesGrid
