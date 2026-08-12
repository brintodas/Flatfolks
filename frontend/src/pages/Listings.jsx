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

function Listings() {
  const [listings, setListings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [bookmarked, setBookmarked]   = useState(new Set()) // set of bookmarked listing IDs
  const userKey = getUserKey()

  useEffect(() => {
    fetch('http://localhost:8000/api/listings')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setListings(json.data)
        } else {
          setError('Failed to load listings')
        }
        setLoading(false)
      })
      .catch(err => {
        console.log(err)
        setError('Could not connect to server')
        setLoading(false)
      })
  }, [])

  // load which listings this user has already bookmarked
  useEffect(() => {
    fetch(`http://localhost:8000/api/bookmarks/ids?user_key=${userKey}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setBookmarked(new Set(json.data))
      })
      .catch(() => {})
  }, [])

  const toggleBookmark = (e, listingId) => {
    e.stopPropagation()
    fetch('http://localhost:8000/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, user_key: userKey })
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setBookmarked(prev => {
            const next = new Set(prev)
            json.bookmarked ? next.add(listingId) : next.delete(listingId)
            return next
          })
        }
      })
      .catch(() => {})
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <p className="text-slate-500">Loading listings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">All Listings</h1>
            <p className="text-slate-500 mt-1">{listings.length} properties found</p>
          </div>
          <Link
            to="/post-listing"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            + Post a Listing
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {listings.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">No listings yet.</p>
            <Link to="/post-listing" className="text-blue-600 font-semibold hover:underline">
              Be the first to post one →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(listing => (
            <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

              {/* Photo or placeholder */}
              <div className="h-44 bg-gradient-to-br from-blue-100 to-blue-200 relative">
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
                  listing.gender_preference === 'male' ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  {listing.gender_preference === 'any' ? 'All Welcome' :
                   listing.gender_preference === 'female' ? 'Girls Only' : 'Boys Only'}
                </span>

                {/* Bookmark button – FR#4 */}
                <button
                  onClick={(e) => toggleBookmark(e, listing.id)}
                  title={bookmarked.has(listing.id) ? 'Remove from watchlist' : 'Save to watchlist'}
                  className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow flex items-center justify-center transition-all ${
                    bookmarked.has(listing.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-400 hover:text-blue-600'
                  }`}
                >
                  <i className={`fa-bookmark text-sm ${
                    bookmarked.has(listing.id) ? 'fa-solid' : 'fa-regular'
                  }`}></i>
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
                  <span className="text-xl font-black text-blue-800">
                    ৳{Number(listing.rent).toLocaleString()}
                    <span className="text-slate-400 text-sm font-normal">/mo</span>
                  </span>
                  <button className="text-xs px-3 py-1.5 border border-blue-600 text-blue-700 font-medium rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default Listings
