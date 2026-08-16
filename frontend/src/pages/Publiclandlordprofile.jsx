import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const STATUS_META = {
  none:     { label: 'Not submitted', color: 'bg-slate-100 text-slate-600', icon: 'fa-circle-minus' },
  pending:  { label: 'Under review',  color: 'bg-amber-50 text-amber-700',  icon: 'fa-clock' },
  approved: { label: 'ID Verified',   color: 'bg-green-50 text-green-700', icon: 'fa-circle-check' },
  rejected: { label: 'Verification rejected', color: 'bg-red-50 text-red-600', icon: 'fa-circle-xmark' },
}

function accountAge(createdAt) {
  if (!createdAt) return null
  const months = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)))
  if (months < 1) return 'Joined this month'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} on Flatfolks`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} on Flatfolks`
}
 
function Stars({ value }) {
  const full = Math.round(value || 0)
  return (
    <span className="text-amber-400 text-sm">
      {[1, 2, 3, 4, 5].map(i => (
        <i key={i} className={i <= full ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
      )).reduce((acc, el, i) => [...acc, i ? <span key={`sp${i}`} className="mx-0.5" /> : null, el], [])}
    </span>
  )
}
 
function PublicLandlordProfile() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
 
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const isOwnProfile = currentUser && String(currentUser.id) === String(id)
 
  useEffect(() => {
    fetch(`http://localhost:8000/api/landlord/${id}/public`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setNotFound(true) } else { setData(json.data) }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
 
    fetch(`http://localhost:8000/api/landlord/${id}/reviews`)
      .then(r => r.json())
      .then(json => { if (json.success) setReviews(json.data) })
      .catch(() => {})
  }, [id])
 
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading profile...</p>
      </div>
    )
  }
 
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-regular fa-face-sad-tear text-slate-300 text-4xl mb-3"></i>
          <h2 className="text-lg font-bold text-slate-700 mb-1">Landlord not found</h2>
          <Link to="/listings" className="mt-5 inline-block text-sm text-blue-700 hover:underline">← Back to listings</Link>
        </div>
      </div>
    )
  }
 
  const displayName = data.business_name || data.full_name
  const isVerified = !!data.has_badge
  const BASE = 'http://localhost:8000/uploads'
  const memberSinceYear = data.created_at ? new Date(data.created_at).getFullYear() : null

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 pt-8">
 
        {/* ── Header Card ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-5">
          <div className="h-2 bg-blue-700 w-full"></div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
 
              <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                {data.profile_picture ? (
                  <img
                    src={`http://localhost:8000${data.profile_picture}`}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                ) : null}
                <span
                  className="text-2xl font-bold text-blue-700"
                  style={{ display: data.profile_picture ? 'none' : 'flex' }}
                >
                  {displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
 
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-800">{displayName}</h1>
                  {isVerified && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      <i className="fa-solid fa-circle-check mr-1"></i>Verified Landlord
                    </span>
                  )}
                  {data.business_type === 'company' && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      <i className="fa-solid fa-building mr-1"></i>Agency
                    </span>
                  )}
                  {memberSinceYear && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                      <i className="fa-regular fa-calendar mr-1"></i>Member since {memberSinceYear}
                    </span>
                  )}
                </div>
 
                <div className="flex items-center gap-2 mb-3">
                  {data.review_count > 0 ? (
                    <>
                      <Stars value={data.avg_rating} />
                      <span className="text-sm font-semibold text-slate-700">{data.avg_rating}</span>
                      <span className="text-sm text-slate-400">({data.review_count} review{data.review_count === 1 ? '' : 's'})</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400">No reviews yet</span>
                  )}
                </div>
 
                {data.bio && <p className="text-sm text-slate-600 leading-relaxed mb-4 max-w-xl">{data.bio}</p>}
 
                <div className="flex flex-wrap gap-2">
                  {isOwnProfile ? (
                    <Link to="/landlord/profile-setup"
                      className="px-4 py-2 text-sm font-semibold border border-blue-700 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                      Edit Business Profile
                    </Link>
                  ) : (
                    <>
                      {data.phone && (
                        <a href={`tel:${data.phone}`} className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">
                          <i className="fa-solid fa-phone mr-1.5"></i>Call
                        </a>
                      )}
                      {currentUser && (
                        <Link to={`/messages/new?to=${id}`} className="px-4 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center">
                          <i className="fa-regular fa-message mr-1.5"></i>Message
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
 
          {/* Stats row */}
          <div className="border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
            <div className="px-4 py-4 text-center">
              <p className="text-xl font-black text-blue-800">{data.total_units}</p>
              <p className="text-xs text-slate-400 mt-0.5">Active Listings</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-xl font-black text-green-700">{data.occupied_units}</p>
              <p className="text-xs text-slate-400 mt-0.5">Occupied</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-xl font-black text-amber-600">{data.vacant_units}</p>
              <p className="text-xs text-slate-400 mt-0.5">Vacant Now</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-xl font-black text-slate-800">{data.occupancy_rate}%</p>
              <p className="text-xs text-slate-400 mt-0.5">Occupancy Rate</p>
            </div>
          </div>
        </div>

        {/* ── Track Record ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Renting Track Record</h2>
          <div className="grid sm:grid-cols-3 gap-5">

            {/* Occupancy rate bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">Current Occupancy</span>
                <span className="text-xs font-semibold text-slate-700">{data.occupancy_rate}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${data.occupancy_rate >= 70 ? 'bg-green-500' : data.occupancy_rate >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                  style={{ width: `${data.occupancy_rate}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {data.occupied_units} of {data.total_units} unit{data.total_units === 1 ? '' : 's'} currently rented
              </p>
            </div>

            {/* Lifetime tenancies */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-key text-blue-600"></i>
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 leading-none">{data.total_tenancies}</p>
                <p className="text-xs text-slate-400 mt-1">Successful rentals to date</p>
              </div>
            </div>

            {/* Units ever rented out */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-house-circle-check text-green-600"></i>
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 leading-none">{data.units_ever_rented}</p>
                <p className="text-xs text-slate-400 mt-1">Different units rented out</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Verification & Responsiveness ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Verification & Responsiveness</h2>
          <div className="grid sm:grid-cols-4 gap-5">

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Identity Verification</p>
              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${(STATUS_META[data.verification_status] || STATUS_META.none).color}`}>
                <i className={`fa-solid ${(STATUS_META[data.verification_status] || STATUS_META.none).icon} mr-1.5`}></i>
                {(STATUS_META[data.verification_status] || STATUS_META.none).label}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Account Age</p>
              <p className="text-sm font-semibold text-slate-700">{accountAge(data.created_at) || '—'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Total Listings Posted</p>
              <p className="text-sm font-semibold text-slate-700">
                {data.total_listings_posted}
                <span className="text-slate-400 font-normal"> lifetime · {data.total_units} currently open</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5">Viewing Request Response</p>
              {data.viewing_requests_total > 0 ? (
                <p className="text-sm font-semibold text-slate-700">
                  {data.viewing_response_rate}%
                  <span className="text-slate-400 font-normal"> of {data.viewing_requests_total} request{data.viewing_requests_total === 1 ? '' : 's'} answered</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400">No requests yet</p>
              )}
            </div>

          </div>
        </div>

        {/* ── Coverage & Pricing ── */}
        {(data.service_areas.length > 0 || data.rent_min) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Where They List</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {data.service_areas.length > 0 && (
                <div className="flex flex-wrap gap-2 flex-1">
                  {data.service_areas.map(area => (
                    <span key={area} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      <i className="fa-solid fa-location-dot mr-1 text-blue-400"></i>{area}
                    </span>
                  ))}
                </div>
              )}
              {data.rent_min && (
                <div className="shrink-0 text-sm">
                  <span className="text-slate-400">Typical rent: </span>
                  <span className="font-bold text-blue-800">
                    ৳{Number(data.rent_min).toLocaleString()}
                    {data.rent_max !== data.rent_min ? ` – ৳${Number(data.rent_max).toLocaleString()}` : ''}
                  </span>
                  <span className="text-slate-400">/mo</span>
                </div>
              )}
            </div>
          </div>
        )}
 
        <div className="grid sm:grid-cols-5 gap-5">
 
          {/* Left: portfolio */}
          <div className="sm:col-span-3 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Active Portfolio</h2>
 
              {data.listings.length === 0 && (
                <p className="text-slate-400 text-sm italic">No active listings right now.</p>
              )}
 
              <div className="space-y-3">
                {data.listings.map(l => (
                  <Link key={l.id} to={`/listings/${l.id}`}
                    className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                    <div className="w-14 h-14 rounded-lg bg-blue-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {l.photos ? (
                        <img src={`${BASE}/${l.photos.split(',')[0]}`} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <i className="fa-solid fa-building text-blue-300"></i>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{l.title}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {l.property_group ? `${l.property_group} · ` : ''}{[l.area, l.district].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-blue-800">৳{Number(l.rent).toLocaleString()}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l.occupied ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-700'}`}>
                        {l.occupied ? 'Occupied' : 'Vacant'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
 
          {/* Right: reviews */}
          <div className="sm:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Student Reviews</h2>

              {data.review_count > 0 && (
                <div className="flex items-center gap-5 mb-5 pb-5 border-b border-slate-50">
                  <div className="text-center shrink-0">
                    <p className="text-3xl font-black text-slate-800 leading-none">{data.avg_rating}</p>
                    <Stars value={data.avg_rating} />
                    <p className="text-[11px] text-slate-400 mt-1">{data.review_count} review{data.review_count === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {data.rating_breakdown?.map(({ rating, count }) => {
                      const pct = data.review_count ? Math.round((count / data.review_count) * 100) : 0
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-2.5 shrink-0">{rating}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-[10px] text-slate-400 w-5 text-right shrink-0">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{r.student_name}</p>
                          {r.verified_tenant && (
                            <span title="This student had a confirmed tenancy with this landlord"
                              className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-700 whitespace-nowrap">
                              <i className="fa-solid fa-house-circle-check mr-0.5"></i>Verified Tenant
                            </span>
                          )}
                        </span>
                        <Stars value={r.rating} />
                      </div>
                      {r.comment && <p className="text-xs text-slate-500 leading-relaxed">{r.comment}</p>}
                      <p className="text-[10px] text-slate-300 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
 
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">
                <i className="fa-solid fa-shield-halved mr-1.5"></i>
                Always verify a listing in person before making any payment.
              </p>
            </div>
          </div>
        </div>
 
        <div className="mt-8">
          <Link to="/listings" className="text-sm text-slate-500 hover:text-blue-700">← Back to listings</Link>
        </div>
      </div>
    </div>
  )
}
 
export default PublicLandlordProfile