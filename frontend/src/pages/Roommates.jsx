import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { calcCompatibility } from '../utils/compatibility'
import { QUIZ_QUESTIONS } from '../utils/quizMeta'

const DISTRICTS = ['Dhaka', 'Gazipur', 'Narayanganj', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Comilla']

const MOVEIN_LABELS = {
  ASAP:       'ASAP',
  '1 month':  'Within 1 month',
  '3 months': 'Within 3 months',
  '6 months': 'Within 6 months',
}

const ROOM_LABELS = { single: 'Single', shared: 'Shared', either: 'Either' }

const emptyFilters = { search: '', district: '', area: '', budget_max: '', room_type: '' }

function matchColor(score) {
  if (score >= 75) return 'bg-green-50 text-green-700 border-green-200'
  if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-600 border-red-200'
}

function matchLabel(score) {
  if (score >= 75) return 'Great match'
  if (score >= 50) return 'Good match'
  return 'Low match'
}

function StudentCard({ p, topPick = false }) {
  const initials  = p.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const photoSrc  = p.profile_photo ? `http://localhost:8000${p.profile_photo}` : null
  const area      = p.preferred_area || p.preferred_district || '—'
  const score     = p.match_score

  const formatTagText = (key, val) => {
    const v = Number(val)
    switch (key) {
      case 'sleep_schedule':  return v===1 ? 'Early bird' : v===2 ? 'Flexible sleep schedule' : 'Night owl'
      case 'cleanliness':     return v===1 ? 'Relaxed cleanliness' : v===2 ? 'Average cleanliness' : 'Neat freak'
      case 'noise_tolerance': return v===1 ? 'Prefers quiet' : v===2 ? 'Moderate noise OK' : 'Lively noise OK'
      case 'guests_pref':     return v===1 ? 'Rarely allows guests' : v===2 ? 'Sometimes allows guests' : 'Often allows guests'
      case 'smoking_pref':    return v===1 ? 'Non-smoker' : v===2 ? 'Flexible about smoking' : 'Smoker'
      case 'study_habits':    return v===1 ? 'Studies at home' : v===2 ? 'Mixed study habits' : 'Studies at library'
      default: return ''
    }
  }

  const tags = QUIZ_QUESTIONS.map(q => {
    const val = p[q.key]
    if (!val) return null
    return { icon: q.icon, label: q.label, value: formatTagText(q.key, val) }
  }).filter(Boolean)

  return (
    <div className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${
      score >= 75 ? 'border-green-200' : 'border-slate-200'
    }`}>
      <div className="p-5">
        {/* Top row: avatar + name + badge */}
        <div className="flex items-start gap-4 mb-3">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-100 border border-slate-200 flex items-center justify-center">
              {photoSrc
                ? <img src={photoSrc} alt={p.full_name} className="w-full h-full object-cover" />
                : <span className="text-base font-bold text-blue-700">{initials}</span>
              }
            </div>
            {topPick && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center" title="Top Pick">
                <i className="fa-solid fa-star text-white text-[8px]"></i>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-800 truncate">{p.full_name}</h3>
              {score != null && (
                <span className={`px-2 py-0.5 text-xs font-semibold border rounded-full ${matchColor(score)}`}>
                  {score}% · {matchLabel(score)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {[p.university, p.department, p.year_of_study ? `${p.year_of_study} year` : null].filter(Boolean).join(' · ') || 'Student'}
            </p>
          </div>
        </div>

        {/* Bio */}
        {p.bio && <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{p.bio}</p>}

        {/* Key info */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="fa-solid fa-location-dot text-slate-300 w-3.5 text-center"></i>
            <span>{area}</span>
          </div>
          {p.budget_max && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <i className="fa-solid fa-bangladeshi-taka-sign text-slate-300 w-3.5 text-center"></i>
              <span>Up to ৳{Number(p.budget_max).toLocaleString()}/mo</span>
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
            {tags.slice(0, 6).map(tag => (
              <span key={tag.label} title={tag.label} className="flex items-center gap-1.5 px-2 py-0.5 text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg">
                <i className={`fa-solid ${tag.icon} text-slate-400 text-[10px]`}></i>
                {tag.value}
              </span>
            ))}
            {tags.length > 6 && <span className="px-2 py-0.5 text-xs text-slate-400">+{tags.length - 6}</span>}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex justify-end">
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
    return { ...emptyFilters, search: params.get('search') || '', budget_max: params.get('max_rent') || '' }
  }

  const [students, setStudents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [filters, setFilters]         = useState(getInitialFilters)
  const [applied, setApplied]         = useState(getInitialFilters)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [myQuiz, setMyQuiz]           = useState(null)
  const [sortMode, setSortMode]       = useState('match') // 'match' | 'newest'
  const [billSummary, setBillSummary] = useState(null)

  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return
    // Fetch quiz
    fetch(`http://localhost:8000/api/profile/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.quiz_completed) {
          setMyQuiz({
            quiz_completed:  data.quiz_completed,
            sleep_schedule:  data.sleep_schedule,
            cleanliness:     data.cleanliness,
            noise_tolerance: data.noise_tolerance,
            guests_pref:     data.guests_pref,
            smoking_pref:    data.smoking_pref,
            study_habits:    data.study_habits,
            w_sleep_schedule:  data.w_sleep_schedule,
            w_cleanliness:     data.w_cleanliness,
            w_noise_tolerance: data.w_noise_tolerance,
            w_guests_pref:     data.w_guests_pref,
            w_smoking_pref:    data.w_smoking_pref,
            w_study_habits:    data.w_study_habits,
          })
        }
      })
      .catch(() => {})

    // Fetch pending bills summary
    fetch(`http://localhost:8000/api/bills/summary/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.hasGroup) {
          setBillSummary(data.data)
        }
      })
      .catch(() => {})
  }, [currentUser?.id])

  const fetchStudents = useCallback((f) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (f.search)     params.set('search',     f.search)
    if (f.district)   params.set('district',   f.district)
    if (f.area)       params.set('area',        f.area)
    if (f.budget_max) params.set('budget_max',  f.budget_max)
    if (f.room_type)  params.set('room_type',   f.room_type)
    if (currentUser?.id) params.set('viewer_id', currentUser.id)

    fetch(`http://localhost:8000/api/profile?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setStudents(data.data)
        else setError('Failed to load roommates.')
        setLoading(false)
      })
      .catch(() => { setError('Could not connect to server.'); setLoading(false) })
  }, [currentUser?.id])

  useEffect(() => { fetchStudents(applied) }, [applied])

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const applyFilters = () => { setApplied(filters); setSidebarOpen(false) }
  const clearFilters = () => { setFilters(emptyFilters); setApplied(emptyFilters) }
  const hasFilters   = Object.values(applied).some(v => v !== '')

  // Compute client-side breakdown when server didn't (no viewer_id)
  const enriched = students
    .filter(s => !currentUser || s.user_id !== currentUser.id)
    .map(s => {
      if (s.match_score != null) return s
      const result = calcCompatibility(myQuiz, s)
      return { ...s, match_score: result ? result.total : null, match_breakdown: result ? result.breakdown : null }
    })

  const sorted = [...enriched].sort((a, b) => {
    if (sortMode === 'newest') return 0 // keep server order (newest first)
    if (a.match_score == null && b.match_score == null) return 0
    if (a.match_score == null) return 1
    if (b.match_score == null) return -1
    return b.match_score - a.match_score
  })

  const topPicks = myQuiz ? sorted.filter(s => s.match_score != null).slice(0, 3) : []
  const topPickIds = new Set(topPicks.map(s => s.user_id))
  const mainList = sorted.filter(s => !topPickIds.has(s.user_id))

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Quiz nudge */}
        {currentUser?.role === 'student' && !myQuiz && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-xl px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Take the lifestyle quiz</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Answer 6 questions and set your priorities to get personalised compatibility scores.
              </p>
            </div>
            <Link to="/lifestyle-quiz"
              className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg">
              Start Quiz
            </Link>
          </div>
        )}

        <div className="flex gap-6">

          {/* ── Sidebar ── */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 p-5 overflow-y-auto transition-transform
            lg:static lg:block lg:w-64 lg:flex-shrink-0 lg:border lg:rounded-xl lg:h-fit lg:sticky lg:top-24
            ${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-700">Filter</h2>
              <div className="flex items-center gap-3">
                {hasFilters && <button onClick={clearFilters} className="text-xs text-blue-700 hover:underline">Clear</button>}
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Search</label>
                <input type="text" value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  placeholder="Name, dept, or bio..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">District</label>
                <select value={filters.district} onChange={e => updateFilter('district', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:border-blue-500">
                  <option value="">Any district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Budget (৳/mo)</label>
                <input type="number" value={filters.budget_max} onChange={e => updateFilter('budget_max', e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room Type</label>
                <div className="space-y-1.5">
                  {[['', 'Any'], ['single', 'Single room'], ['shared', 'Shared room'], ['either', 'Either']].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="room_type" value={val} checked={filters.room_type === val}
                        onChange={() => updateFilter('room_type', val)} className="accent-blue-700" />
                      <span className="text-sm text-slate-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={applyFilters}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">
                Apply Filters
              </button>

              {/* Shared Bills Widget */}
              <div className="pt-4 border-t border-slate-100">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-xl p-3.5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <i className="fa-solid fa-receipt text-blue-700 text-xs"></i>
                    <h3 className="text-xs font-bold text-slate-800">Shared Bills & Split</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    {billSummary
                      ? `${billSummary.groupName} • ${billSummary.pendingCount} bills logged`
                      : 'Split utilities, Wi-Fi, and groceries with flatmates.'}
                  </p>
                  {billSummary && (
                    <div className="mb-2 text-xs font-bold flex items-center justify-between">
                      <span className="text-slate-600">Net Standing:</span>
                      <span className={billSummary.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {billSummary.netBalance >= 0 ? `+৳${billSummary.netBalance}` : `-৳${Math.abs(billSummary.netBalance)}`}
                      </span>
                    </div>
                  )}
                  <Link
                    to="/bills"
                    className="block text-center py-1.5 px-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Open Bills Tracker →
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" />}

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Mobile filter toggle + sort toggle */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 lg:hidden">
                <i className="fa-solid fa-sliders"></i> Filters
                {hasFilters && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
              </button>

              {myQuiz && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 ml-auto">
                  {[['match', 'Best Match', 'fa-star'], ['newest', 'Newest', 'fa-clock']].map(([mode, label, icon]) => (
                    <button key={mode} onClick={() => setSortMode(mode)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        sortMode === mode ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'
                      }`}>
                      <i className={`fa-solid ${icon} mr-1.5`}></i>
                      {label}
                    </button>
                  ))}
                </div>
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
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && sorted.length === 0 && (
              <div className="text-center py-16">
                <i className="fa-regular fa-user-group text-slate-300 text-4xl mb-4"></i>
                <h3 className="text-slate-600 font-semibold mb-1">No students found</h3>
                <p className="text-slate-400 text-sm">Try adjusting your filters or check back later.</p>
                {hasFilters && <button onClick={clearFilters} className="mt-4 text-sm text-blue-700 hover:underline">Clear all filters</button>}
              </div>
            )}

            {!loading && !error && sorted.length > 0 && (
              <>
                {/* Top Picks */}
                {topPicks.length > 0 && sortMode === 'match' && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-star text-yellow-500"></i>
                      <h2 className="text-sm font-bold text-slate-700">Top Picks For You</h2>
                      <span className="text-xs text-slate-400">Based on your priorities</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {topPicks.map(p => <StudentCard key={p.user_id} p={p} topPick />)}
                    </div>
                    {mainList.length > 0 && (
                      <div className="border-t border-slate-200 mt-8 mb-6 pt-6">
                        <h2 className="text-sm font-bold text-slate-700 mb-4">All Students</h2>
                      </div>
                    )}
                  </div>
                )}

                {/* Main grid */}
                {mainList.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mainList.map(p => <StudentCard key={p.user_id} p={p} />)}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default Roommates
