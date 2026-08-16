import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import InteractiveMap from '../components/Map/InteractiveMap'

const emptyFilters = {
  search: '',
  minRent: '',
  maxRent: '',
  maxDistance: '',
  furnished: '',
  utilities: '',
  gender: '',
  lease: '',
  availableBefore: ''
}

function getUserKey() {
  let key = localStorage.getItem('ff_user_key')
  if (!key) {
    key = 'guest_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem('ff_user_key', key)
  }
  return key
}

function generateMockListings() {
  return [
    { id: 'm1', title: 'Cozy 2BR in Banani', rent: 25000, beds: 2, furnished: true, utilities_included: false, gender_preference: 'any', location: 'Banani, Dhaka', lat: 23.794, lng: 90.404 },
    { id: 'm2', title: 'Student Room in Dhanmondi', rent: 12000, beds: 1, furnished: false, utilities_included: true, gender_preference: 'male', location: 'Dhanmondi, Dhaka', lat: 23.746, lng: 90.374 },
    { id: 'm3', title: 'Spacious Flat in Gulshan', rent: 45000, beds: 3, furnished: true, utilities_included: true, gender_preference: 'any', location: 'Gulshan, Dhaka', lat: 23.792, lng: 90.413 },
    { id: 'm4', title: 'Affordable Sublet near NSU', rent: 8000, beds: 1, furnished: false, utilities_included: true, gender_preference: 'female', location: 'Bashundhara, Dhaka', lat: 23.815, lng: 90.427 },
  ];
}

function Listings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      ...emptyFilters,
      search: params.get('search') || '',
      maxRent: params.get('max_rent') || '',
      availableBefore: params.get('available_before') || ''
    }
  })
  const [bookmarked, setBookmarked]   = useState(new Set()) // set of bookmarked listing IDs
  const [viewMode, setViewMode]       = useState('list')    // 'list' or 'map'
  const [groupContext, setGroupContext] = useState(null)     // group search context from API
  const userKey    = getUserKey()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.minRent) params.set('min_rent', filters.minRent)
    if (filters.maxRent) params.set('max_rent', filters.maxRent)
    if (filters.maxDistance) params.set('max_distance', filters.maxDistance)
    if (filters.furnished) params.set('furnished', filters.furnished)
    if (filters.utilities) params.set('utilities_included', filters.utilities)
    if (filters.gender) params.set('gender_preference', filters.gender)
    if (filters.lease) params.set('lease_duration', filters.lease)
    if (filters.availableBefore) params.set('available_before', filters.availableBefore)

    // Pass user_id so the backend can activate group-context filtering
    if (currentUser?.role === 'student') params.set('user_id', currentUser.id)

    const qs = params.toString()
    const url = 'http://localhost:8000/api/listings' + (qs ? `?${qs}` : '')

    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      fetch(url)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setListings(json.data || [])
            setGroupContext(json.groupContext || null)
          } else {
            setListings(generateMockListings())
            setGroupContext(null)
            setError('Could not load listings. Showing mock data.')
          }
          setLoading(false)
        })
        .catch(() => {
          setError('Could not connect to server. Showing mock data.')
          setListings(generateMockListings())
          setGroupContext(null)
          setLoading(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [filters])

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

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  const renderListingCard = (listing) => (
    <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">

      {/* Photo or placeholder */}
      <div className="h-44 bg-gradient-to-br from-blue-100 to-blue-200 relative">
        {listing.photos
          ? <img src={`http://localhost:8000/uploads/${listing.photos.split(',')[0]}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={listing.title} />
          : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <i className="fa-solid fa-house text-4xl mb-2"></i>
            <span className="text-xs font-medium">No Photo</span>
          </div>
        }

        {/* Bookmark button */}
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
          {[listing.area, listing.district].filter(Boolean).join(', ') || listing.location}
        </p>

        {listing.gender_preference && listing.gender_preference !== 'any' && (
          <div className="mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${listing.gender_preference === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
              {listing.gender_preference === 'female' ? 'Girls Only' : 'Boys Only'}
            </span>
          </div>
        )}

        <div className="mb-3">
          {listing.available_from ? (
            <p className="text-xs font-medium text-indigo-700 bg-indigo-50 inline-block px-2 py-1 rounded-md">
              <i className="fa-regular fa-calendar mr-1"></i>
              Available from {new Date(listing.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          ) : (
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 inline-block px-2 py-1 rounded-md">
              <i className="fa-solid fa-bolt mr-1"></i>
              Immediate Move-in
            </p>
          )}
        </div>

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
          {listing.distance_to_campus ? (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{listing.distance_to_campus} km to campus</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl font-black text-blue-800">
            ৳{Number(listing.rent).toLocaleString()}
            <span className="text-slate-400 text-sm font-normal">/mo</span>
          </span>
          <Link
            to={`/listings/${listing.id}`}
            className="text-xs px-3 py-1.5 border border-blue-600 text-blue-700 font-medium rounded-lg hover:bg-blue-600 hover:text-white transition-all"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  )

  const renderStatusMessages = () => (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!loading && listings.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-slate-400 text-lg mb-4">
            {hasActiveFilters ? 'No listings match your filters.' : 'No listings yet.'}
          </p>
          {hasActiveFilters ? (
            <button onClick={() => setFilters(emptyFilters)} className="text-blue-600 font-semibold hover:underline">
              Clear filters
            </button>
          ) : (
            <Link to="/post-listing" className="text-blue-600 font-semibold hover:underline">
              Be the first to post one →
            </Link>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">


        <div className="mb-6 flex flex-col md:flex-row gap-2 items-center bg-white p-1.5 pl-4 rounded-full border border-slate-200 shadow-sm">
          <div className="relative flex-1 w-full flex items-center">
            <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Search by title, area, or location..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full bg-transparent pl-3 pr-4 py-1.5 text-sm text-slate-800 outline-none"
            />
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-full shrink-0 w-full md:w-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 md:w-24 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <i className="fa-solid fa-list-ul"></i> List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 md:w-24 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                viewMode === 'map' 
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <i className="fa-regular fa-map"></i> Map View
            </button>
          </div>
        </div>

        {/* ── Group search banner ───────────────────────────────────────────── */}
        {groupContext && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-people-group text-white text-xs"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                Searching as a group · {groupContext.memberCount} {groupContext.memberCount === 1 ? 'member' : 'members'}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Combined budget ৳{Number(groupContext.maxBudget).toLocaleString()}/mo
                &nbsp;·&nbsp;Minimum {groupContext.minBeds} bed{groupContext.minBeds !== 1 ? 's' : ''} needed
              </p>
            </div>
            <span className="text-xs bg-blue-700 text-white px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
              Group Mode
            </span>
          </div>
        )}

        {/* Results summary & Post Listing (Landlords) */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-800">
            {loading ? 'Searching...' : `${listings.length} properties found`}
          </p>
          {currentUser?.role === 'landlord' && (
            <Link
              to="/post-listing"
              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              + Post a Listing
            </Link>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters sidebar */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 lg:sticky lg:top-20">

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Filters</p>
                {hasActiveFilters && (
                  <button
                    onClick={() => setFilters(emptyFilters)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Rent range */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rent Range (৳/mo)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minRent}
                    onChange={(e) => updateFilter('minRent', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 text-sm">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxRent}
                    onChange={(e) => updateFilter('maxRent', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Distance from campus */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max Distance from Campus (km)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 3"
                  value={filters.maxDistance}
                  onChange={(e) => updateFilter('maxDistance', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Furnished */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Furnished</label>
                <select
                  value={filters.furnished}
                  onChange={(e) => updateFilter('furnished', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Any</option>
                  <option value="true">Furnished</option>
                  <option value="false">Unfurnished</option>
                </select>
              </div>

              {/* Utilities */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Utilities</label>
                <select
                  value={filters.utilities}
                  onChange={(e) => updateFilter('utilities', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Any</option>
                  <option value="true">Included</option>
                  <option value="false">Not Included</option>
                </select>
              </div>

              {/* Gender preference */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Gender Preference</label>
                <select
                  value={filters.gender}
                  onChange={(e) => updateFilter('gender', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Any</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                  <option value="any">All Welcome</option>
                </select>
              </div>

              {/* Lease duration */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Lease Duration</label>
                <select
                  value={filters.lease}
                  onChange={(e) => updateFilter('lease', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Any</option>
                  <option value="1 month">1 Month</option>
                  <option value="3 months">3 Months</option>
                  <option value="6 months">6 Months</option>
                  <option value="1 year">1 Year</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>

              {/* Move-in date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Move-in by</label>
                <input
                  type="date"
                  value={filters.availableBefore}
                  onChange={(e) => updateFilter('availableBefore', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            
            {viewMode === 'map' ? (
              <div className="h-[calc(100vh-120px)] w-full">
                <InteractiveMap listings={listings} />
              </div>
            ) : (
              <div className="flex-1">
                {renderStatusMessages()}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map(renderListingCard)}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

export default Listings