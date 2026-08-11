const steps = [
  {
    icon: 'fa-magnifying-glass',
    step: 1,
    title: 'Search & Filter',
    desc: 'Filter by rent, distance from campus, furnished status, gender preference, and move-in date.',
  },
  {
    icon: 'fa-people-arrows',
    step: 2,
    title: 'Match & Connect',
    desc: 'Take our lifestyle quiz and get matched with compatible roommates. Chat in-app, no personal numbers shared.',
  },
  {
    icon: 'fa-key',
    step: 3,
    title: 'Sign & Move In',
    desc: 'Sign digital leases, complete a move-in report, and get utility & maintenance support on the platform.',
  },
]

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Simple Process</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Find Your Home in 3 Steps</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            From search to signed lease — Flatfolks makes the entire process smooth and secure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center group">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 bg-blue-100 group-hover:bg-blue-700 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 shadow-md">
                  <i className={`fa-solid ${step.icon} text-3xl text-blue-700 group-hover:text-white transition-colors duration-300`}></i>
                </div>
                <span className="absolute -top-3 -right-3 w-7 h-7 bg-blue-700 text-white text-xs font-black rounded-full flex items-center justify-center shadow">
                  {step.step}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
