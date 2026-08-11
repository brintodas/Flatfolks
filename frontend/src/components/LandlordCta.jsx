const LandlordCta = () => {
  return (
    <section id="for-landlords" className="py-20 bg-blue-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <p className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">For Landlords</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
              Reach Thousands of<br />Verified Students
            </h2>
            <p className="text-blue-200 text-lg leading-relaxed mb-8">
              Post listings with rich media, manage all properties from one dashboard, review tenant applications,
              and schedule viewings — everything in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#" className="px-7 py-3.5 bg-white text-blue-800 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg text-sm">
                List Your Property
              </a>
              <a href="#" className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all border border-blue-500 text-sm">
                Learn More
              </a>
            </div>
          </div>

          {/* Right: Benefit Cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: 'fa-shield-halved',  title: 'Verified Badge',     desc: 'Upload ownership docs and earn a trusted landlord badge.' },
              { icon: 'fa-chart-bar',      title: 'Smart Dashboard',    desc: 'Manage listings, vacancies, and tenant contacts with charts.' },
              { icon: 'fa-calendar-check', title: 'Viewing Scheduler',  desc: 'Approve viewing requests via shared scheduling calendar.' },
              { icon: 'fa-user-check',     title: 'Tenant Manager',     desc: 'Review and approve student applications with notes.' },
            ].map((card, i) => (
              <div key={i}
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <i className={`fa-solid ${card.icon} text-2xl text-blue-300 mb-3`}></i>
                <h4 className="text-white font-bold mb-1">{card.title}</h4>
                <p className="text-blue-300 text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

export default LandlordCta
