import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

function ListingDetail() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)
  const [showAllPhotos, setShowAllPhotos] = useState(false)

  useEffect(() => {
    fetch(`http://localhost:8000/api/listings/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setListing(json.data)
        else setError('Listing not found')
        setLoading(false)
      })
      .catch(() => { setError('Could not connect to server'); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">Loading listing...</p>
      </div>
    </div>
  )

  if (error || !listing) return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-16 gap-4">
      <i className="fa-solid fa-triangle-exclamation text-3xl text-slate-300"></i>
      <p className="text-slate-600">{error || 'Something went wrong.'}</p>
      <Link to="/listings" className="text-blue-600 hover:underline text-sm">← Back to listings</Link>
    </div>
  )

  const photos = listing.photos ? listing.photos.split(',').filter(p => p.trim()) : []
  const BASE = 'http://localhost:8000/uploads'

  const genderColor = listing.gender_preference === 'female' ? '#db2777' :
                      listing.gender_preference === 'male'   ? '#2563eb' : '#16a34a'
  const genderLabel = listing.gender_preference === 'any'    ? 'All Welcome' :
                      listing.gender_preference === 'female' ? 'Girls Only' : 'Boys Only'

  const amenities = [
    { key: 'has_wifi',      icon: 'fa-wifi',           label: 'WiFi'      },
    { key: 'has_generator', icon: 'fa-bolt',           label: 'Generator' },
    { key: 'has_cctv',      icon: 'fa-video',          label: 'CCTV'      },
    { key: 'has_lift',      icon: 'fa-elevator',       label: 'Lift'      },
    { key: 'has_fridge',    icon: 'fa-temperature-low',label: 'Fridge'    },
  ].filter(a => listing[a.key])

  return (
    <div className="min-h-screen bg-white pt-16">

      {/* ── Photo Section ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-0">
        <Link to="/listings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to listings
        </Link>

        {/* Airbnb-style photo grid */}
        {photos.length > 0 ? (
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 480 }}>
            {photos.length === 1 ? (
              <img src={`${BASE}/${photos[0]}`} alt={listing.title}
                className="w-full h-full object-cover" />
            ) : (
              <div className="grid h-full gap-2"
                style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                {/* Big left photo */}
                <img src={`${BASE}/${photos[0]}`} alt={listing.title}
                  onClick={() => { setActivePhoto(0); setShowAllPhotos(true) }}
                  className="row-span-2 w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" />
                {/* Two right thumbnails */}
                {photos.slice(1, 3).map((p, i) => (
                  <img key={i} src={`${BASE}/${p}`} alt=""
                    onClick={() => { setActivePhoto(i + 1); setShowAllPhotos(true) }}
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" />
                ))}
              </div>
            )}
            {/* Show all photos button */}
            {photos.length > 3 && (
              <button onClick={() => setShowAllPhotos(true)}
                className="absolute bottom-4 right-4 bg-white text-slate-800 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all">
                <i className="fa-regular fa-images"></i> Show all {photos.length} photos
              </button>
            )}
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-slate-100 flex items-center justify-center" style={{ height: 480 }}>
            <i className="fa-solid fa-building text-6xl text-slate-300"></i>
          </div>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────── */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-white text-sm font-medium">{activePhoto + 1} / {photos.length}</span>
            <button onClick={() => setShowAllPhotos(false)}
              className="text-white hover:text-slate-300 text-xl transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 relative">
            <button onClick={() => setActivePhoto(p => (p - 1 + photos.length) % photos.length)}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <img src={`${BASE}/${photos[activePhoto]}`} alt=""
              className="max-h-[80vh] max-w-full object-contain rounded-lg" />
            <button onClick={() => setActivePhoto(p => (p + 1) % photos.length)}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          {/* Thumbnail strip */}
          <div className="flex gap-2 px-6 py-4 overflow-x-auto">
            {photos.map((p, i) => (
              <img key={i} src={`${BASE}/${p}`} alt=""
                onClick={() => setActivePhoto(i)}
                className={`h-14 w-20 object-cover rounded-lg cursor-pointer shrink-0 transition-all ${i === activePhoto ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-80'}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* ── Left ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Title row */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mb-2">
                  {listing.title}
                </h1>
                <p className="text-slate-500 flex items-center gap-1.5">
                  <i className="fa-solid fa-location-dot text-blue-500 text-sm"></i>
                  {[listing.location, listing.area, listing.district].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-white"
                style={{ background: genderColor }}>
                {genderLabel}
              </span>
            </div>

            {/* Quick stats — Airbnb-style */}
            <div className="flex flex-wrap gap-6 py-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bed text-slate-400"></i>
                <span className="text-slate-700 font-medium">{listing.beds} Bedroom{listing.beds > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className={`fa-solid fa-couch text-slate-400`}></i>
                <span className="text-slate-700 font-medium">{listing.furnished ? 'Furnished' : 'Unfurnished'}</span>
              </div>
              {listing.utilities_included && (
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bolt text-slate-400"></i>
                  <span className="text-slate-700 font-medium">Bills Included</span>
                </div>
              )}
              {listing.lease_duration && (
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-file-contract text-slate-400"></i>
                  <span className="text-slate-700 font-medium">{listing.lease_duration} lease</span>
                </div>
              )}
              {listing.distance_to_campus && (
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-school text-slate-400"></i>
                  <span className="text-slate-700 font-medium">{listing.distance_to_campus} km to campus</span>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="py-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">About this place</h2>
                <p className="text-slate-600 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="py-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">What this place offers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenities.map(a => (
                    <div key={a.key} className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-xl">
                      <i className={`fa-solid ${a.icon} text-blue-600 w-5 text-center`}></i>
                      <span className="text-slate-700 text-sm font-medium">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property rules */}
            <div className="py-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">House rules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: 'fa-user-group', label: 'Guests', value: listing.guests_allowed ? 'Allowed' : 'Not allowed' },
                  { icon: 'fa-smoking',    label: 'Smoking', value: listing.smoking_allowed ? 'Allowed' : 'Not allowed' },
                  { icon: 'fa-clock',      label: 'Curfew',  value: listing.curfew_time || 'None' },
                  { icon: 'fa-money-bill', label: 'Advance', value: listing.advance_deposit ? listing.advance_deposit : '—' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <i className={`fa-solid ${rule.icon} text-slate-400 w-5 text-center`}></i>
                    <div>
                      <p className="text-xs text-slate-400">{rule.label}</p>
                      <p className="text-sm font-medium text-slate-700">{rule.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Tour */}
            {listing.video && (
              <div className="py-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Video Tour</h2>
                <video controls className="w-full rounded-2xl bg-black" style={{ maxHeight: 360 }}>
                  <source src={`${BASE}/${listing.video}`} type="video/mp4" />
                  <source src={`${BASE}/${listing.video}`} type="video/webm" />
                </video>
              </div>
            )}

            {/* Floor Plan */}
            {listing.floor_plan && (
              <div className="py-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Floor Plan</h2>
                <img src={`${BASE}/${listing.floor_plan}`} alt="Floor plan"
                  className="w-full rounded-2xl border border-slate-100"
                  onError={e => { e.target.style.display = 'none' }} />
              </div>
            )}
          </div>

          {/* ── Right — Sticky Booking Card ───────────────── */}
          <div className="lg:w-[360px] shrink-0">
            <div className="sticky top-24 space-y-4">
              <div className="border border-slate-200 rounded-2xl shadow-lg overflow-hidden">

                {/* Price header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-slate-900">
                      ৳{Number(listing.rent).toLocaleString()}
                    </span>
                    <span className="text-slate-400 font-normal">/ month</span>
                  </div>
                  {listing.available_from && (
                    <p className="text-sm text-slate-500 mt-1">
                      Available from{' '}
                      <span className="font-semibold text-slate-800">
                        {new Date(listing.available_from).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </p>
                  )}
                </div>

                {/* Contact info */}
                <div className="px-6 py-5">
                  {listing.landlord_name && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-user text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Hosted by</p>
                        <p className="text-sm font-semibold text-slate-800">{listing.landlord_name}</p>
                      </div>
                    </div>
                  )}

                  {listing.landlord_phone && (
                    <a href={`tel:${listing.landlord_phone}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-5">
                      <i className="fa-solid fa-phone text-slate-400 text-xs"></i>
                      {listing.landlord_phone}
                    </a>
                  )}

                  <a href={`tel:${listing.landlord_phone}`}
                    className="flex items-center justify-center gap-2 w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl transition-colors mb-3">
                    <i className="fa-solid fa-phone"></i> Call Now
                  </a>

              {listing.landlord_name && (
                listing.landlord_id ? (
                  <Link
                    to={`/landlord/${listing.landlord_id}`}
                    className="text-sm text-slate-600 hover:text-blue-700 mb-1 flex items-center gap-2 group"
                  >
                    <i className="fa-solid fa-user text-slate-400 text-xs w-4"></i>
                    <span className="group-hover:underline">{listing.landlord_name}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300 group-hover:text-blue-500"></i>
                  </Link>
                ) : (
                  <p className="text-sm text-slate-600 mb-1 flex items-center gap-2">
                    <i className="fa-solid fa-user text-slate-400 text-xs w-4"></i>
                    {listing.landlord_name}
                  </p>
                )
              )}
                  {listing.landlord_phone && (
                    <a href={`https://wa.me/880${listing.landlord_phone.replace(/^0/, '')}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full border border-green-500 text-green-700 hover:bg-green-50 font-semibold py-3.5 rounded-xl transition-colors">
                      <i className="fa-brands fa-whatsapp text-lg"></i> WhatsApp
                    </a>
                  )}
                </div>
              </div>
              {/* Property Details card */}
              <div className="border border-slate-200 rounded-2xl p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Property details</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Type',      value: listing.property_type ? listing.property_type.replace('_', ' ') : 'Entire Flat' },
                    { label: 'Bedrooms',  value: listing.beds },
                    { label: 'Furnished', value: listing.furnished ? 'Yes' : 'No' },
                    { label: 'Utilities', value: listing.utilities_included ? 'Included' : 'Not included' },
                    ...(listing.lease_duration ? [{ label: 'Lease', value: listing.lease_duration }] : []),
                    { label: 'For',       value: listing.gender_preference === 'any' ? 'All genders' : listing.gender_preference === 'female' ? 'Girls only' : 'Boys only' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-medium text-slate-800 capitalize">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 360 walkthrough */}
              {listing.walkthrough_link && (
                <a href={listing.walkthrough_link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 justify-center w-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-3 rounded-xl text-sm transition-colors">
                  <i className="fa-solid fa-vr-cardboard"></i> View 360° Walkthrough
                </a>
              )}

              {listing.landlord_id && (
                <Link
                  to={`/landlord/${listing.landlord_id}`}
                  className="block w-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-700 text-sm font-semibold text-center py-2.5 rounded-lg transition-colors mt-2"
                >
                  View Landlord Profile
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default ListingDetail