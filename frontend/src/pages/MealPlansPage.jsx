import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

const DISTRICTS = ['Dhaka', 'Gazipur', 'Narayanganj', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Comilla']

const MEAL_TYPES = [
  { value: '', label: 'All types' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'full_board', label: 'Full board' },
  { value: 'custom', label: 'Custom combo' },
]

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  full_board: 'Full board',
  custom: 'Custom combo',
}

const DELIVERY_LABELS = {
  pickup: 'Pickup',
  home_delivery: 'Home delivery',
  both: 'Pickup or delivery',
}

function formatPrice(plan) {
  if (plan.price_monthly) return `৳${Number(plan.price_monthly).toLocaleString()}/mo`
  if (plan.price_weekly) return `৳${Number(plan.price_weekly).toLocaleString()}/wk`
  return 'Contact for price'
}

function MealPlanCard({ plan }) {
  const tags = plan.cuisine_tags ? plan.cuisine_tags.split(',').filter(Boolean) : []

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">{plan.provider_name}</p>
            <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
          </div>
          {plan.provider_verified === 1 && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100 rounded-full">
              Verified
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
            {MEAL_LABELS[plan.meal_type] || plan.meal_type}
          </span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
            {DELIVERY_LABELS[plan.delivery_type] || plan.delivery_type}
          </span>
          {plan.meals_per_day && (
            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
              {plan.meals_per_day} meals/day
            </span>
          )}
        </div>

        <div className="space-y-1.5 mb-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-slate-300 w-3.5 text-center"></i>
            <span>{plan.provider_area}, {plan.provider_district}</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-bangladeshi-taka-sign text-slate-300 w-3.5 text-center"></i>
            <span className="font-semibold text-slate-700">{formatPrice(plan)}</span>
          </div>
          {plan.provider_rating && (
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-star text-amber-400 w-3.5 text-center"></i>
              <span>{Number(plan.provider_rating).toFixed(1)} rating</span>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 text-[11px] bg-slate-50 text-slate-600 border border-slate-100 rounded-full capitalize">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 capitalize">{plan.min_commitment} plan</span>
          <Link
            to={`/meal-plans/${plan.id}`}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            View Plan
          </Link>
        </div>
      </div>
    </div>
  )
}

const emptyFilters = { search: '', area: '', district: 'Dhaka', meal_type: '', max_price: '' }

export default function MealPlansPage() {
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)

  const fetchPlans = useCallback((f) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (f.search) params.set('search', f.search)
    if (f.area) params.set('area', f.area)
    if (f.district) params.set('district', f.district)
    if (f.meal_type) params.set('meal_type', f.meal_type)
    if (f.max_price) params.set('max_price', f.max_price)

    fetch(`http://localhost:8000/api/meals/plans?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setPlans(data.data)
        else setError('Failed to load meal plans.')
        setLoading(false)
      })
      .catch(() => { setError('Could not connect to server.'); setLoading(false) })
  }, [])

  useEffect(() => {
    document.title = 'Meal Plans & Mess Subscriptions – Flatfolks'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => { fetchPlans(applied) }, [applied, fetchPlans])

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return
    fetch(`http://localhost:8000/api/meals/subscriptions?user_id=${currentUser.id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setSubscriptions(data.data) })
      .catch(() => {})
  }, [currentUser?.id])

  const activeSub = subscriptions.find(s => s.status === 'active')
  const pendingSub = subscriptions.find(s => s.status === 'pending')

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const applyFilters = () => setApplied(filters)
  const clearFilters = () => { setFilters(emptyFilters); setApplied(emptyFilters) }
  const hasFilters = Object.entries(applied).some(([k, v]) => k !== 'district' && v !== '') || applied.district !== 'Dhaka'

  const handleCancel = async (subId) => {
    if (!currentUser) return
    if (!window.confirm('Cancel this meal plan subscription?')) return
    try {
      const res = await fetch(`http://localhost:8000/api/meals/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, status: 'cancelled' }),
      })
      const data = await res.json()
      if (data.success) {
        setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: 'cancelled' } : s))
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-6">
          <Link to="/" className="hover:text-blue-700 transition-colors">Home</Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="text-slate-800 font-semibold">Meal Plans</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Meal Plans & Mess Subscriptions</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Subscribe to local catering or mess plans for daily meals while you settle into a new place without kitchen access.
          </p>
        </div>

        {pendingSub && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>Payment pending
                </p>
                <h2 className="text-base font-bold text-slate-800">{pendingSub.plan_name}</h2>
                <p className="text-sm text-slate-500">{pendingSub.provider_name} · {pendingSub.provider_area}</p>
                <p className="text-xs text-amber-700 mt-1.5 font-medium">
                  Confirm payment to activate this subscription — it's waiting for you in Due Payments.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to="/payments"
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Complete Payment
                </Link>
                <button
                  onClick={() => handleCancel(pendingSub.id)}
                  className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSub && (
          <div className="mb-6 bg-white border border-green-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">
                  <i className="fa-solid fa-circle-check mr-1.5"></i>Active subscription
                </p>
                <h2 className="text-base font-bold text-slate-800">{activeSub.plan_name}</h2>
                <p className="text-sm text-slate-500">{activeSub.provider_name} · {activeSub.provider_area}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Started {new Date(activeSub.start_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleCancel(activeSub.id)}
                className="shrink-0 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg"
              >
                Cancel subscription
              </button>
            </div>
          </div>
        )}

        {!currentUser && (
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-blue-800">Sign in as a student to subscribe to a meal plan.</p>
            <Link to="/signin" className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg">
              Sign In
            </Link>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-5 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-slate-700">Filter</h2>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-blue-700 hover:underline">Clear</button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={e => updateFilter('search', e.target.value)}
                    placeholder="Mess, catering, lunch..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">District</label>
                  <select
                    value={filters.district}
                    onChange={e => updateFilter('district', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  >
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Area</label>
                  <input
                    type="text"
                    value={filters.area}
                    onChange={e => updateFilter('area', e.target.value)}
                    placeholder="e.g. Badda, Uttara"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Meal type</label>
                  <select
                    value={filters.meal_type}
                    onChange={e => updateFilter('meal_type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  >
                    {MEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max monthly (৳)</label>
                  <input
                    type="number"
                    value={filters.max_price}
                    onChange={e => updateFilter('max_price', e.target.value)}
                    placeholder="e.g. 6000"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={applyFilters}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="text-center py-20 text-slate-400 text-sm">Loading meal plans...</div>
            ) : error ? (
              <div className="text-center py-20 text-red-500 text-sm">{error}</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-20">
                <i className="fa-solid fa-utensils text-slate-300 text-4xl mb-3"></i>
                <p className="text-slate-500 text-sm">No meal plans found for these filters.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">{plans.length} plan{plans.length !== 1 ? 's' : ''} available</p>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {plans.map(plan => <MealPlanCard key={plan.id} plan={plan} />)}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}