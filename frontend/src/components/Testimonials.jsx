const testimonials = [
  {
    text: '"I found my flat and two compatible roommates within a week! The compatibility quiz was so accurate — we\'ve been living together for 6 months with zero drama."',
    name: 'Sadia Rahman', role: 'CSE Student · BRACU',
    initial: 'S', gradient: 'from-blue-400 to-blue-700',
    stars: 5, highlight: true,
  },
  {
    text: '"The map view was a game-changer. I could instantly see how far each listing was from my campus gate and the nearest bus stops. Signed my lease digitally — super convenient!"',
    name: 'Arif Hossain', role: 'EEE Student · NSU',
    initial: 'A', gradient: 'from-indigo-400 to-purple-600',
    stars: 5, highlight: false,
  },
  {
    text: '"As a landlord, the multi-property dashboard is fantastic. I can track all my listings, manage tenant applications, and schedule viewings without any back-and-forth messages."',
    name: 'Karim Uddin', role: 'Landlord · Dhanmondi',
    initial: 'K', gradient: 'from-teal-400 to-blue-600',
    stars: 4.5, highlight: true,
  },
]

const Testimonials = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Student Stories</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">What Students Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i}
              className={`p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                t.highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100 shadow-md'
              }`}>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, si) => (
                  <i key={si} className="fa-solid fa-star text-yellow-400 text-sm"></i>
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6 text-sm">{t.text}</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {t.initial}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default Testimonials
