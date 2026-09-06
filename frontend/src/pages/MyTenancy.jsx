import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API = 'http://localhost:8000/api'

const STATUS_COLORS = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ended:  'bg-slate-100 text-slate-500 border-slate-200',
}

export default function MyTenancy() {
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const [tenancy, setTenancy]   = useState(undefined) // undefined = loading
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!currentUser?.id) return
    fetch(`${API}/landlord/tenancies/student/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setTenancy(data.tenancy || null)
        else setError(data.message)
      })
      .catch(() => setError('Network error.'))
  }, [currentUser?.id])

  // ── Auth guard ──
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-lock text-slate-300 text-4xl mb-4" />
          <p className="text-slate-500 text-sm mb-4">Sign in to view your tenancy.</p>
          <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">Sign In</Link>
        </div>
      </div>
    )
  }
  if (currentUser.role !== 'student') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <p className="text-slate-500">This page is for students only.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-house-user text-blue-600" />
            My Tenancy
          </h1>
          <p className="text-slate-500 text-sm mt-1">Your active lease details and quick actions.</p>
        </div>

        {/* Loading */}
        {tenancy === undefined && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-blue-400 text-3xl mb-3" />
            <p className="text-slate-400 text-sm">Loading your tenancy...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* No tenancy */}
        {tenancy === null && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <i className="fa-regular fa-building text-slate-200 text-5xl mb-4" />
            <h2 className="text-lg font-bold text-slate-700 mb-2">No active lease yet</h2>
            <p className="text-slate-500 text-sm mb-6">
              Apply to a listing and wait for landlord approval. Once approved, your tenancy details will appear here.
            </p>
            <Link to="/listings" className="inline-block px-6 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors">
              Browse Listings
            </Link>
          </div>
        )}

        {/* Active tenancy card */}
        {tenancy && (
          <>
            {/* Status badge */}
            <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-fit border ${STATUS_COLORS[tenancy.status] || STATUS_COLORS.active}`}>
              <span className={`w-2 h-2 rounded-full ${tenancy.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {tenancy.status === 'active' ? 'Active Lease' : 'Lease Ended'}
            </div>

            {/* Property details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-blue-700 px-6 py-4">
                <h2 className="text-white font-bold text-lg">{tenancy.listing_title}</h2>
                <p className="text-blue-200 text-sm mt-0.5">
                  <i className="fa-solid fa-location-dot mr-1" />
                  {[tenancy.area, tenancy.district, tenancy.location].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="p-6 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Monthly Rent</p>
                  <p className="text-2xl font-black text-slate-900">৳{Number(tenancy.rent_amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Lease Started</p>
                  <p className="text-base font-bold text-slate-800">
                    {new Date(tenancy.start_date).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {tenancy.end_date && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Lease Ended</p>
                    <p className="text-base font-bold text-slate-800">
                      {new Date(tenancy.end_date).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Landlord contact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-blue-500 text-xs" /> Landlord
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-700 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {tenancy.landlord_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{tenancy.landlord_name}</p>
                  <div className="flex gap-3 mt-0.5">
                    {tenancy.landlord_phone && (
                      <a href={`tel:${tenancy.landlord_phone}`} className="text-xs text-blue-600 hover:underline">
                        <i className="fa-solid fa-phone mr-1" />{tenancy.landlord_phone}
                      </a>
                    )}
                    {tenancy.landlord_email && (
                      <a href={`mailto:${tenancy.landlord_email}`} className="text-xs text-blue-600 hover:underline">
                        <i className="fa-solid fa-envelope mr-1" />{tenancy.landlord_email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            {tenancy.status === 'active' && (
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/payments"
                  className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-2xl text-sm transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-credit-card" />
                  Pay Rent
                </Link>
                <Link
                  to="/maintenance"
                  className="flex items-center justify-center gap-2 border-2 border-blue-700 text-blue-700 hover:bg-blue-50 font-bold py-4 rounded-2xl text-sm transition-colors"
                >
                  <i className="fa-solid fa-wrench" />
                  Maintenance Request
                </Link>
              </div>
            )}

            {/* Rent Reminder shortcut */}
            {tenancy.status === 'active' && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-800">Never miss a rent payment</p>
                  <p className="text-xs text-amber-600 mt-0.5">Set up automatic reminders 7, 3, and 1 day before your due date.</p>
                </div>
                <Link to="/rent-reminder" className="ml-4 shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors">
                  Set Reminder
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
