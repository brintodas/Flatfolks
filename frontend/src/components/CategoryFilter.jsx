import { useNavigate } from 'react-router-dom'

const categories = [
  { icon: 'fa-building-user', label: 'Shared Room', query: '?search=Shared' },
  { icon: 'fa-door-closed',   label: 'Studio Flat', query: '?search=Studio' },
  { icon: 'fa-bed',           label: '1-Bedroom', query: '?search=1-Bedroom' },
  { icon: 'fa-house',         label: '2-Bedroom', query: '?search=2-Bedroom' },
  { icon: 'fa-city',          label: '3-Bedroom', query: '?search=3-Bedroom' },
  { icon: 'fa-couch',         label: 'Furnished', query: '?furnished=true' },
  { icon: 'fa-female',        label: 'Girls Only', query: '?gender_preference=female' },
  { icon: 'fa-bolt',          label: 'Bills Included', query: '?utilities_included=true' },
]

const CategoryFilter = () => {
  const navigate = useNavigate()

  return (
    <section className="py-12 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Browse by Type</h2>
          <button onClick={() => navigate('/listings')} className="text-sm text-blue-600 font-semibold hover:underline">See all →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((cat, i) => (
            <button key={i} onClick={() => navigate(`/listings${cat.query}`)}
              className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl font-medium text-sm cursor-pointer transition-all duration-200 border bg-slate-50 text-slate-700 border-slate-100 hover:bg-blue-800 hover:text-white hover:border-blue-800 hover:-translate-y-0.5">
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
