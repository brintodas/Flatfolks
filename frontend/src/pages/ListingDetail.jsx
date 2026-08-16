import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

function ListingDetail() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    fetch(`http://localhost:8000/api/listings/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setListing(json.data)
        } else {
          setError('Listing not found')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not connect to server')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16 gap-4">
        <p className="text-slate-600">{error || 'Something went wrong.'}</p>
        <Link to="/listings" className="text-blue-600 hover:underline text-sm">← Back to listings</Link>
      </div>
    )
  }

  const photos = listing.photos ? listing.photos.split(',').filter(p => p.trim()) : []
  const BASE = 'http://localhost:8000/uploads'

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4">

        {/* Back link */}
        <Link to="/listings" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-5">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to listings
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left column — media + details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Photo gallery */}
            {photos.length > 0 && (
              <div>
                <img
                  src={`${BASE}/${photos[activePhoto]}`}
                  alt={listing.title}
                  className="w-full h-72 object-cover rounded-xl"
                  onError={e => { e.target.style.display = 'none' }}
                />
                {photos.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {photos.map((photo, i) => (
                      <img
                        key={i}
                        src={`${BASE}/${photo}`}
                        alt=""
                        onClick={() => setActivePhoto(i)}
                        className={`h-16 w-24 object-cover rounded-lg cursor-pointer shrink-0 border-2 transition-all ${i === activePhoto ? 'border-blue-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No photos fallback */}
            {photos.length === 0 && (
              <div className="w-full h-72 bg-blue-50 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-building text-5xl text-blue-200"></i>
              </div>
            )}

            {/* Title + basic info */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-2xl font-bold text-slate-800 leading-snug">{listing.title}</h1>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded text-white ${
                  listing.gender_preference === 'female' ? 'bg-pink-500' :
                  listing.gender_preference === 'male' ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  {listing.gender_preference === 'any' ? 'All Welcome' :
                   listing.gender_preference === 'female' ? 'Girls Only' : 'Boys Only'}
                </span>
              </div>

              <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
                <i className="fa-solid fa-location-dot text-blue-500"></i>
                {[listing.location, listing.area, listing.district].filter(Boolean).join(', ')}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  {listing.beds} Bed{listing.beds > 1 ? 's' : ''}
                </span>
                {listing.furnished ? (
                  <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">Furnished</span>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">Unfurnished</span>
                )}
                {listing.utilities_included ? (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">Bills Included</span>
                ) : null}
                {listing.lease_duration ? (
                  <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">{listing.lease_duration}</span>
                ) : null}
              </div>

              {listing.description && (
                <p className="text-slate-600 text-sm leading-relaxed">{listing.description}</p>
              )}
            </div>

            {/* Video Tour */}
            {listing.video && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">Video Tour</h2>
                <video
                  controls
                  className="w-full rounded-xl bg-black"
                  style={{ maxHeight: '320px' }}
                >
                  <source src={`${BASE}/${listing.video}`} type="video/mp4" />
                  <source src={`${BASE}/${listing.video}`} type="video/webm" />
                  Your browser doesn't support video playback.
                </video>
              </div>
            )}

            {/* Floor Plan */}
            {listing.floor_plan && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">Floor Plan</h2>
                <img
                  src={`${BASE}/${listing.floor_plan}`}
                  alt="Floor plan"
                  className="w-full rounded-xl border border-slate-100"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            )}

            {/* 360 Walkthrough */}
            {listing.walkthrough_link && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-2">360° Walkthrough</h2>
                <a
                  href={listing.walkthrough_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <i className="fa-solid fa-vr-cardboard"></i>
                  View 360° Tour →
                </a>
              </div>
            )}

          </div>

          {/* Right column — price + contact */}
          <div className="space-y-4">

            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <p className="text-3xl font-black text-blue-800">
                ৳{Number(listing.rent).toLocaleString()}
                <span className="text-slate-400 text-base font-normal"> /month</span>
              </p>

              {listing.available_from && (
                <p className="text-sm text-slate-500 mt-2">
                  Available from{' '}
                  <span className="font-medium text-slate-700">
                    {new Date(listing.available_from).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </p>
              )}

              <hr className="my-4 border-slate-100" />

              <p className="text-sm font-semibold text-slate-700 mb-3">Contact Landlord</p>

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
                <a
                  href={`tel:${listing.landlord_phone}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4"
                >
                  <i className="fa-solid fa-phone text-slate-400 text-xs w-4"></i>
                  {listing.landlord_phone}
                </a>
              )}

              <a
                href={`tel:${listing.landlord_phone}`}
                className="block w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold text-center py-2.5 rounded-lg transition-colors"
              >
                Call Now
              </a>

              {listing.landlord_phone && (
                <a
                  href={`https://wa.me/880${listing.landlord_phone.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full border border-green-500 text-green-700 hover:bg-green-50 text-sm font-semibold text-center py-2.5 rounded-lg transition-colors mt-2"
                >
                  WhatsApp
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

            {/* Quick info panel */}
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm text-sm text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800 mb-3">Property Details</p>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium capitalize">{listing.property_type ? listing.property_type.replace('_', ' ') : 'Entire Flat'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Beds</span>
                <span className="font-medium">{listing.beds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Furnished</span>
                <span className="font-medium">{listing.furnished ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Utilities</span>
                <span className="font-medium">{listing.utilities_included ? 'Included' : 'Not included'}</span>
              </div>
              {listing.lease_duration && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Lease</span>
                  <span className="font-medium">{listing.lease_duration}</span>
                </div>
              )}
              {listing.distance_to_campus && (
                <div className="flex justify-between">
                  <span className="text-slate-500">To Campus</span>
                  <span className="font-medium">{listing.distance_to_campus} km</span>
                </div>
              )}
              {listing.advance_deposit && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Advance</span>
                  <span className="font-medium">{listing.advance_deposit}</span>
                </div>
              )}
              {listing.curfew_time && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Curfew</span>
                  <span className="font-medium">{listing.curfew_time}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Guests</span>
                <span className="font-medium">{listing.guests_allowed ? 'Allowed' : 'Not allowed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Smoking</span>
                <span className="font-medium">{listing.smoking_allowed ? 'Allowed' : 'Not allowed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">For</span>
                <span className="font-medium capitalize">{listing.gender_preference === 'any' ? 'All' : listing.gender_preference}</span>
              </div>
            </div>

            {/* Amenities */}
            {(listing.has_wifi || listing.has_generator || listing.has_cctv || listing.has_lift || listing.has_fridge) ? (
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <p className="font-semibold text-slate-800 mb-3 text-sm">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {listing.has_wifi ? <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">WiFi</span> : null}
                  {listing.has_generator ? <span className="text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">Generator</span> : null}
                  {listing.has_cctv ? <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">CCTV</span> : null}
                  {listing.has_lift ? <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">Lift</span> : null}
                  {listing.has_fridge ? <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">Fridge</span> : null}
                </div>
              </div>
            ) : null}


          </div>
        </div>
      </div>
    </div>
  )
}

export default ListingDetail