import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const API = 'http://localhost:8000/api'

export default function MyApplications() {
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.id) return
    fetch(`${API}/listings/applications/student/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setApps(data.applications)
      })
      .finally(() => setLoading(false))
  }, [currentUser?.id])

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6">
          <i className="fa-solid fa-file-signature text-blue-600" />
          My Applications
        </h1>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3" />
            <p className="text-sm">Loading applications...</p>
          </div>
        ) : !apps || apps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <i className="fa-regular fa-folder-open text-slate-300 text-5xl mb-4" />
            <h2 className="text-lg font-bold text-slate-700 mb-2">No applications yet</h2>
            <p className="text-sm text-slate-500 mb-6">You haven't applied to any listings yet.</p>
            <Link to="/listings" className="inline-block px-6 py-2.5 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {apps.map(app => (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row gap-4">
                {/* Photo */}
                <div className="w-full md:w-48 h-32 shrink-0 rounded-xl bg-slate-100 overflow-hidden relative">
                  {app.photos ? (
                    <img src={`http://localhost:8000/uploads/${app.photos.split(',')[0]}`} alt="Listing" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><i className="fa-regular fa-image text-2xl" /></div>
                  )}
                  {/* Status badge overlaid */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md ${
                      app.status === 'pending'  ? 'bg-amber-100/90 text-amber-800 border border-amber-200/50' :
                      app.status === 'approved' ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/50' :
                      'bg-red-100/90 text-red-800 border border-red-200/50'
                    }`}>
                      {app.status === 'pending' ? 'Pending' : app.status === 'approved' ? 'Approved' : 'Declined'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{app.listing_title}</h3>
                    <p className="text-sm text-slate-500 mb-2"><i className="fa-solid fa-location-dot mr-1 text-slate-400" />{app.listing_location}</p>
                    <p className="text-sm font-semibold text-slate-700">৳{Number(app.rent).toLocaleString()}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                  </div>
                  
                  <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      Applied on {new Date(app.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link to={`/listings/${app.listing_id}`} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                        View Listing
                      </Link>
                      {app.status === 'approved' && (
                        <Link to="/my-tenancy" className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                          Go to Tenancy
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional Decline Reason */}
                {app.status === 'declined' && app.decline_reason && (
                  <div className="w-full md:w-64 shrink-0 bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-wide mb-1">Reason for decline</p>
                    <p className="text-xs text-red-700 italic">"{app.decline_reason}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
