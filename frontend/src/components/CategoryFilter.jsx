import { useState } from 'react'

const categories = [
  { icon: 'fa-building-user', label: 'Shared Room' },
  { icon: 'fa-door-closed',   label: 'Studio Flat' },
  { icon: 'fa-bed',           label: '1-Bedroom' },
  { icon: 'fa-house',         label: '2-Bedroom' },
  { icon: 'fa-city',          label: '3-Bedroom' },
  { icon: 'fa-couch',         label: 'Furnished' },
  { icon: 'fa-female',        label: 'Girls Only' },
  { icon: 'fa-bolt',          label: 'Bills Included' },
]

const CategoryFilter = () => {
  const [active, setActive] = useState(0)

  return (
    <section className="py-12 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Browse by Type</h2>
          <a href="#" className="text-sm text-blue-600 font-semibold hover:underline">See all →</a>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((cat, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl font-medium text-sm cursor-pointer transition-all duration-200 border ${
                active === i
                  ? 'bg-blue-800 text-white border-blue-800 shadow-lg -translate-y-0.5'
                  : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-blue-800 hover:text-white hover:border-blue-800 hover:-translate-y-0.5'
              }`}>
              <i className={`fa-solid ${cat.icon} text-xl`}></i>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategoryFilter
