import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  full_board: 'Full board',
  custom: 'Custom combo',
}

const DELIVERY_LABELS = {
  pickup: 'Pickup from mess',
  home_delivery: 'Home delivery',
  both: 'Pickup or home delivery',
}

function formatPrice(plan) {
  if (plan?.price_monthly) return `৳${Number(plan.price_monthly).toLocaleString()}/month`
  if (plan?.price_weekly) return `৳${Number(plan.price_weekly).toLocaleString()}/week`
  return 'Contact provider'
}

export default function MealPlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    start_date: new Date().toISOString().slice(0, 10),
    delivery_address: '',
    special_notes: '',
  })

  useEffect(() => {
    document.title = 'Meal Plan Details – Flatfolks'
    window.scrollTo(0, 0)
    fetch(`http://localhost:8000/api/meals/plans/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setPlan(data.data)
        else setNotFound(true)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubscribe = async e => {
    e.preventDefault()
    setError('')

    if (!currentUser) {
      navigate('/signin')
      return
    }
    if (currentUser.role !== 'student') {
      setError('Only students can subscribe to meal plans.')
      return
    }

    setSubscribing(true)
    try {
      const res = await fetch('http://localhost:8000/api/meals/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          plan_id: Number(id),
          ...form,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Subscription is now 'pending' — send the student to the payment
        // gateway to complete it, exactly like the maintenance booking flow.
        const params = new URLSearchParams({
          service_type: 'meal_subscription',
          reference_id: data.subscription_id,
          amount: data.amount_due || 0,
          title: data.plan_name || plan.name || 'Meal Plan Subscription',
        })
        navigate(`/payments?${params.toString()}`)
      } else {
        setError(data.message || 'Could not subscribe.')
      }
    } catch {
      setError('Could not connect to server.')
    }
    setSubscribing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading plan...</p>
      </div>
    )
  }

  if (notFound || !plan) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-700 mb-1">Plan not found</h2>
          <Link to="/meal-plans" className="text-sm text-blue-700 hover:underline">← Back to meal plans</Link>
        </div>
      </div>
    )
  }

  const tags = plan.cuisine_tags ? plan.cuisine_tags.split(',').filter(Boolean) : []
  const areas = plan.serving_areas ? plan.serving_areas.split(',').filter(Boolean) : []

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-6">
          <Link to="/" className="hover:text-blue-700 transition-colors">Home</Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <Link to="/meal-plans" className="hover:text-blue-700 transition-colors">Meal Plans</Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="text-slate-800 font-semibold">{plan.name}</span>
        </nav>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{plan.provider_name}</p>
                  <h1 className="text-2xl font-bold text-slate-800">{plan.name}</h1>
                </div>
                {plan.provider_verified === 1 && (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-100 rounded-full">
                    Verified provider
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Price', value: formatPrice(plan) },
                  { label: 'Meal type', value: MEAL_LABELS[plan.meal_type] },
                  { label: 'Meals per day', value: plan.meals_per_day || '—' },
                  { label: 'Delivery', value: DELIVERY_LABELS[plan.delivery_type] },
                  { label: 'Commitment', value: plan.min_commitment },
                  { label: 'Location', value: `${plan.provider_area}, ${plan.provider_district}` },
                ].map(item => (
                  <div key={item.label} className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {plan.provider_description && (
                <div className="mb-5">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">About provider</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{plan.provider_description}</p>
                </div>
              )}

              {plan.menu_sample && (
                <div className="mb-5">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Sample menu</h2>
                  <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 whitespace-pre-line">
                    {plan.menu_sample}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <div className="mb-5">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Cuisine</h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full capitalize">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {areas.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Serving areas</h2>
                  <div className="flex flex-wrap gap-2">
                    {areas.map(area => (
                      <span key={area} className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                        {area.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl p-6 lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-slate-800 mb-1">Subscribe to this plan</h2>
              <p className="text-xs text-slate-500 mb-5">
                Perfect if you have moved in but do not have kitchen access yet. You'll choose how to pay on the next step.
              </p>

              {!currentUser ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-4">Sign in as a student to subscribe.</p>
                  <Link to="/signin" className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg">
                    Sign In
                  </Link>
                </div>
              ) : currentUser.role !== 'student' ? (
                <p className="text-sm text-slate-500">Meal plan subscriptions are for students only.</p>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Start date</label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      value={form.start_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Delivery address</label>
                    <input
                      type="text"
                      name="delivery_address"
                      value={form.delivery_address}
                      onChange={handleChange}
                      placeholder="Flat, road, area"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Special notes</label>
                    <textarea
                      name="special_notes"
                      value={form.special_notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Allergies, veg preference, pickup time..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {plan.provider_phone && (
                    <p className="text-xs text-slate-400">
                      Provider contact: {plan.provider_phone}
                    </p>
                  )}

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={subscribing}
                    className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60"
                  >
                    {subscribing ? 'Starting subscription...' : 'Continue to Payment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}