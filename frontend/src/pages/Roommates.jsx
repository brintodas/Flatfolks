import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

const DISTRICTS = ['Dhaka', 'Gazipur', 'Narayanganj', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Comilla']

const MOVEIN_LABELS = {
  ASAP:       'ASAP',
  '1 month':  'Within 1 month',
  '3 months': 'Within 3 months',
  '6 months': 'Within 6 months',
}

const ROOM_LABELS = { single: 'Single', shared: 'Shared', either: 'Either' }

const emptyFilters = { search: '', district: '', area: '', budget_max: '', room_type: '' }

function StudentCard({ p }) {
  const initials   = p.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const photoSrc   = p.profile_photo ? `http://localhost:8000${p.profile_photo}` : null
  const tags       = p.personality_tags ? p.personality_tags.split(',').filter(Boolean) : []
  const budgetMax  = p.budget_max
  const area       = p.preferred_area || p.preferred_district || '—'

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Top row: avatar + name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            {photoSrc
              ? <img src={photoSrc} alt={p.full_name} className="w-full h-full object-cover" />
              : <span className="text-base font-bold text-blue-700">{initials}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-800 truncate">{p.full_name}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {[p.department, p.year_of_study ? `${p.year_of_study} year` : null].filter(Boolean).join(' · ') || 'BRACU Student'}
            </p>
          </div>
        </div>

        {/* Bio */}
        {p.bio && (
          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{p.bio}</p>
        )}

        {/* Key info */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="fa-solid fa-location-dot text-slate-300 w-3.5 text-center"></i>
            <span>{area}</span>
          </div>
          {budgetMax && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <i className="fa-solid fa-bangladeshi-taka-sign text-slate-300 w-3.5 text-center"></i>
              <span>Up to ৳{Number(budgetMax).toLocaleString()}/mo</span>
            </div>
          )}
          {p.move_in_timeframe && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <i className="fa-solid fa-calendar-check text-slate-300 w-3.5 text-center"></i>
              <span>{MOVEIN_LABELS[p.move_in_timeframe] || p.move_in_timeframe}</span>
            </div>
          )}
          {p.room_type && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <i className="fa-solid fa-bed text-slate-300 w-3.5 text-center"></i>
              <span>{ROOM_LABELS[p.room_type] || p.room_type} room</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-slate-400">+{tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          {p.quiz_completed
            ? <span className="text-xs text-green-600"><i className="fa-solid fa-circle-check mr-1"></i>Quiz done</span>
            : <span className="text-xs text-slate-400"><i className="fa-regular fa-clock mr-1"></i>Quiz pending</span>
          }
          <Link to={`/roommate/${p.user_id}`}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">
            View Profile
          </Link>
        </div>
      </div>
    </div>
  )
}

function Roommates() {
  const getInitialFilters = () => {
    const params = new URLSearchParams(window.location.search)
    return {
      ...emptyFilters,
      search: params.get('search') || '',
      budget_max: params.get('max_rent') || ''
    }
  }

  const [students, setStudents]  = useState([])
  const [loading, setLoading]    = useState(true)
  const [error, setError]        = useState('')
  const [filters, setFilters]    = useState(getInitialFilters)
  const [applied, setApplied]    = useState(getInitialFilters)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const fetchStudents = useCallback((f) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (f.search)     params.set('search',     f.search)
    if (f.district)   params.set('district',   f.district)
    if (f.area)       params.set('area',        f.area)
    if (f.budget_max) params.set('budget_max',  f.budget_max)
    if (f.room_type)  params.set('room_type',   f.room_type)

    fetch(`http://localhost:8000/api/profile?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setStudents(data.data)
        else setError('Failed to load roommates.')
        setLoading(false)
      })
      .catch(() => { setError('Could not connect to server.'); setLoading(false) })
  }, [])

  useEffect(() => { fetchStudents(applied) }, [applied])

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const applyFilters = () => { setApplied(filters); setSidebarOpen(false) }
  const clearFilters = () => { setFilters(emptyFilters); setApplied(emptyFilters) }
  const hasFilters   = Object.values(applied).some(v => v !== '')

  // exclude logged in user from browsing their own card
  const visibleStudents = students.filter(s => !currentUser || s.user_id !== currentUser.id)

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Find a Roommate</h1>
          <p className="text-slate-500 text-sm mt-1">Browse students looking for flatmates near BRACU.</p>
        </div>

        <div className="flex gap-6">

          {/* ── Sidebar Filters ── */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 p-5 overflow-y-auto transition-transform
            lg:static lg:block lg:w-64 lg:flex-shrink-0 lg:border lg:rounded-xl lg:h-fit lg:sticky lg:top-24
            ${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-700">Filter</h2>
              <div className="flex items-center gap-3">
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-blue-700 hover:underline">Clear</button>
                )}
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="space-y-5">

              {/* Search */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  placeholder="Name, dept, or bio..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">District</label>
                <select
                  value={filters.district}
                  onChange={e => updateFilter('district', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:border-blue-500"
                >
                  <option value="">Any district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Max Budget */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Budget (৳/mo)</label>
                <input
                  type="number"
                  value={filters.budget_max}
                  onChange={e => updateFilter('budget_max', e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              {/* Room type */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room Type</label>
                <div className="space-y-1.5">
                  {[['', 'Any'], ['single', 'Single room'], ['shared', 'Shared room'], ['either', 'Either']].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="room_type"
                        value={val}
                        checked={filters.room_type === val}
                        onChange={() => updateFilter('room_type', val)}
                        className="accent-blue-700"
                      />
                      <span className="text-sm text-slate-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={applyFilters}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">
                Apply Filters
              </button>
            </div>
          </aside>

          {/* ── Mobile sidebar overlay ── */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/30 z-30 lg:hidden" />
          )}

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
                  <i className="fa-solid fa-sliders"></i> Filters
                  {hasFilters && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                </button>
                {!loading && (
                  <p className="text-sm text-slate-500">
                    {visibleStudents.length} {visibleStudents.length === 1 ? 'student' : 'students'} found
                  </p>
                )}
              </div>
              {currentUser?.role === 'student' && (
                <Link to="/roommate-profile"
                  className="px-4 py-2 text-sm font-semibold border border-blue-700 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                  <i className="fa-regular fa-user mr-1.5"></i>My Profile
                </Link>
              )}
            </div>

            {/* Active filter pills */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {applied.search && (
                  <span className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    "{applied.search}"
                    <button onClick={() => { updateFilter('search',''); setApplied(p => ({...p, search:''})) }} className="ml-1.5 hover:text-red-500">×</button>
                  </span>
                )}
                {applied.district && (
                  <span className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    {applied.district}
                    <button onClick={() => { updateFilter('district',''); setApplied(p => ({...p, district:''})) }} className="ml-1.5 hover:text-red-500">×</button>
                  </span>
                )}
                {applied.budget_max && (
                  <span className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Max ৳{Number(applied.budget_max).toLocaleString()}
                    <button onClick={() => { updateFilter('budget_max',''); setApplied(p => ({...p, budget_max:''})) }} className="ml-1.5 hover:text-red-500">×</button>
                  </span>
                )}
                {applied.room_type && (
                  <span className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    {ROOM_LABELS[applied.room_type]}
                    <button onClick={() => { updateFilter('room_type',''); setApplied(p => ({...p, room_type:''})) }} className="ml-1.5 hover:text-red-500">×</button>
                  </span>
                )}
              </div>
            )}

            {/* States */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg mb-4">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                    <div className="flex gap-3 mb-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-full"></div>
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 rounded"></div>
                      <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                      <div className="h-3 bg-slate-100 rounded w-4/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && visibleStudents.length === 0 && (
              <div className="text-center py-16">
                <i className="fa-regular fa-user-group text-slate-300 text-4xl mb-4"></i>
                <h3 className="text-slate-600 font-semibold mb-1">No students found</h3>
                <p className="text-slate-400 text-sm">Try adjusting your filters or check back later.</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-4 text-sm text-blue-700 hover:underline">Clear all filters</button>
                )}
              </div>
            )}

            {!loading && !error && visibleStudents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleStudents.map(p => <StudentCard key={p.user_id} p={p} />)}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default Roommates
