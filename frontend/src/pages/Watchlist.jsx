import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// stable guest key stored in localStorage so bookmarks persist per browser
function getUserKey() {
  let key = localStorage.getItem('ff_user_key')
  if (!key) {
    key = 'guest_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem('ff_user_key', key)
  }
  return key
}

function Watchlist() {
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-regular fa-bookmark text-slate-300 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Sign in to view your Watchlist</h2>
          <p className="text-slate-500 text-sm mb-6">Save properties you like and track rent changes — but you need an account first.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">
              Sign In
            </Link>
            <Link to="/get-started" className="px-5 py-2.5 border border-blue-700 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    )
  }


  const [watchlist, setWatchlist]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [notifications, setNotifications] = useState([])
  const userKey = getUserKey()

  useEffect(() => {
    fetch(`http://localhost:8000/api/bookmarks?user_key=${userKey}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setWatchlist(json.data)
          // collect rent-drop and availability-change alerts
          const alerts = json.data.filter(
           l => l.rent_dropped || l.availability_changed
          )
          setNotifications(alerts)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const removeBookmark = (listingId) => {
    fetch('http://localhost:8000/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, user_key: userKey })
    }).then(() => {
      setWatchlist(prev => prev.filter(l => l.id !== listingId))
      setNotifications(prev => prev.filter(l => l.id !== listingId))
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <p className="text-slate-500">Loading your watchlist...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-bookmark text-blue-600"></i>
              My Watchlist
            </h1>
            <p className="text-slate-500 mt-1">{watchlist.length} saved {watchlist.length === 1 ? 'property' : 'properties'}</p>
          </div>
          <Link
            to="/listings"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Browse More
          </Link>
        </div>

        {/* Rent-drop notification banners */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.map(n => (
              <div key={n.id} className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
                <i className="fa-solid fa-arrow-trend-down text-green-600"></i>
                <span>
  <strong>{n.title}</strong>
  {n.rent_dropped && (
    <>
      {' '}— Rent dropped from{' '}
      <span className="line-through">
        ৳{Number(n.bookmarked_rent).toLocaleString()}
      </span>{' '}
      to <strong>৳{Number(n.rent).toLocaleString()}</strong>.
    </>
  )}

  {n.availability_changed && (
    <>
      {' '}— Availability has changed.
      {n.available_from && (
        <> Now available from <strong>
          {new Date(n.available_from).toLocaleDateString()}
        </strong>.</>
      )}
    </>
  )}
</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {watchlist.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="fa-regular fa-bookmark text-4xl text-blue-300"></i>
            </div>
            <p className="text-slate-400 text-lg mb-2">No saved properties yet.</p>
            <p className="text-slate-400 text-sm mb-6">Click the bookmark icon on any listing to save it here.</p>
            <Link to="/listings" className="text-blue-600 font-semibold hover:underline">
              Browse listings →
            </Link>
          </div>
        )}

        {/* Watchlist grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map(listing => (
            <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">

              {/* Rent-drop badge */}
              {listing.rent_dropped && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-green-500 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-1">
                  <i className="fa-solid fa-arrow-trend-down"></i>
                  Rent dropped by ৳{Number(listing.rent_drop_amount).toLocaleString()}!
                </div>
              )}

              {/* Photo */}
              <div className={`h-44 bg-gradient-to-br from-blue-100 to-blue-200 relative ${listing.rent_dropped ? 'mt-6' : ''}`}>
                {listing.photos ? (
                  <img
                    src={`http://localhost:8000/uploads/${listing.photos.split(',')[0]}`}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fa-solid fa-building text-4xl text-blue-300"></i>
                  </div>
                )}

                <span className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded text-white ${
                  listing.gender_preference === 'female' ? 'bg-pink-500' :
                  listing.gender_preference === 'male'   ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  {listing.gender_preference === 'any' ? 'All Welcome' :
                   listing.gender_preference === 'female' ? 'Girls Only' : 'Boys Only'}
                </span>

                {/* Remove bookmark button */}
                <button
                  onClick={() => removeBookmark(listing.id)}
                  title="Remove from watchlist"
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-blue-600 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-bookmark text-sm"></i>
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-slate-800 mb-1 truncate">{listing.title}</h3>
                <p className="text-slate-500 text-sm mb-2 flex items-center gap-1">
                  <i className="fa-solid fa-location-dot text-blue-500 text-xs"></i>
                  {listing.location}
                </p>

                <div className="flex gap-2 flex-wrap mb-3">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {listing.beds} Bed{listing.beds > 1 ? 's' : ''}
                  </span>
                  {listing.furnished ? (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Furnished</span>
                  ) : null}
                  {listing.utilities_included ? (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Bills Incl.</span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black text-blue-800">
                      ৳{Number(listing.rent).toLocaleString()}
                      <span className="text-slate-400 text-sm font-normal">/mo</span>
                    </span>
                    {listing.rent_dropped && (
                      <p className="text-xs text-slate-400 line-through">
                        was ৳{Number(listing.bookmarked_rent).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    Saved {new Date(listing.bookmarked_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default Watchlist
