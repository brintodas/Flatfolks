import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

const BASE = 'http://localhost:8000'

// ── Comparison criteria definition ──────────────────────────────
// `better`: 'lower' | 'higher' — which direction wins that row
// `getValue`: numeric/boolean value used to decide a winner (null = "can't compare")
// `format`: how the raw listing value is displayed to the user
const CRITERIA = [
  {
    key: 'rent', label: 'Monthly Rent', icon: 'fa-money-bill-wave', category: 'Affordability',
    better: 'lower',
    getValue: l => (l.rent != null ? Number(l.rent) : null),
    format: l => `৳${Number(l.rent).toLocaleString()}/mo`,
  },
  {
    key: 'rent_per_bed', label: 'Rent per Bedroom', icon: 'fa-calculator', category: 'Affordability',
    better: 'lower',
    getValue: l => (l.rent != null && l.beds ? Number(l.rent) / Number(l.beds) : null),
    format: l => (l.beds ? `৳${Math.round(Number(l.rent) / Number(l.beds)).toLocaleString()}` : '—'),
  },
  {
    key: 'utilities_included', label: 'Utilities / Bills', icon: 'fa-bolt', category: 'Affordability',
    better: 'higher',
    getValue: l => (l.utilities_included ? 1 : 0),
    format: l => (l.utilities_included ? 'Included' : 'Not included'),
  },
  {
    key: 'advance_deposit', label: 'Advance Deposit', icon: 'fa-hand-holding-dollar', category: 'Affordability',
    better: null, // descriptive only, not scored (free-text field)
    getValue: () => null,
    format: l => l.advance_deposit || '—',
  },
  {
    key: 'distance_to_campus', label: 'Distance to Campus', icon: 'fa-school', category: 'Location',
    better: 'lower',
    getValue: l => (l.distance_to_campus != null ? Number(l.distance_to_campus) : null),
    format: l => (l.distance_to_campus != null ? `${l.distance_to_campus} km` : 'Not specified'),
  },
  {
    key: 'location', label: 'Area', icon: 'fa-location-dot', category: 'Location',
    better: null,
    getValue: () => null,
    format: l => [l.area, l.district].filter(Boolean).join(', ') || l.location || '—',
  },
  {
    key: 'beds', label: 'Bedrooms', icon: 'fa-bed', category: 'Space & Comfort',
    better: 'higher',
    getValue: l => (l.beds != null ? Number(l.beds) : null),
    format: l => l.beds ?? '—',
  },
  {
    key: 'property_type', label: 'Property Type', icon: 'fa-house', category: 'Space & Comfort',
    better: null,
    getValue: () => null,
    format: l => (l.property_type ? l.property_type.replaceAll('_', ' ') : '—'),
  },
  {
    key: 'furnished', label: 'Furnished', icon: 'fa-couch', category: 'Space & Comfort',
    better: 'higher',
    getValue: l => (l.furnished ? 1 : 0),
    format: l => (l.furnished ? 'Yes' : 'No'),
  },
  {
    key: 'has_wifi', label: 'WiFi', icon: 'fa-wifi', category: 'Amenities',
    better: 'higher', getValue: l => (l.has_wifi ? 1 : 0), format: l => (l.has_wifi ? 'Yes' : 'No'),
  },
  {
    key: 'has_generator', label: 'Generator Backup', icon: 'fa-plug', category: 'Amenities',
    better: 'higher', getValue: l => (l.has_generator ? 1 : 0), format: l => (l.has_generator ? 'Yes' : 'No'),
  },
  {
    key: 'has_cctv', label: 'CCTV Security', icon: 'fa-video', category: 'Amenities',
    better: 'higher', getValue: l => (l.has_cctv ? 1 : 0), format: l => (l.has_cctv ? 'Yes' : 'No'),
  },
  {
    key: 'has_lift', label: 'Lift', icon: 'fa-elevator', category: 'Amenities',
    better: 'higher', getValue: l => (l.has_lift ? 1 : 0), format: l => (l.has_lift ? 'Yes' : 'No'),
  },
  {
    key: 'has_fridge', label: 'Fridge', icon: 'fa-temperature-low', category: 'Amenities',
    better: 'higher', getValue: l => (l.has_fridge ? 1 : 0), format: l => (l.has_fridge ? 'Yes' : 'No'),
  },
  {
    key: 'is_verified', label: 'Verified Listing', icon: 'fa-shield-halved', category: 'Trust & Transparency',
    better: 'higher',
    getValue: l => (l.is_verified ? 1 : 0),
    format: l => (l.is_verified ? 'Verified' : 'Not verified'),
  },
  {
    key: 'media', label: 'Photos / Video / Floor Plan', icon: 'fa-images', category: 'Trust & Transparency',
    better: 'higher',
    getValue: l => {
      const photoCount = l.photos ? l.photos.split(',').filter(Boolean).length : 0
      return (photoCount > 0 ? 1 : 0) + (l.video ? 1 : 0) + (l.floor_plan ? 1 : 0) + (l.walkthrough_link ? 1 : 0)
    },
    format: l => {
      const photoCount = l.photos ? l.photos.split(',').filter(Boolean).length : 0
      const parts = []
      if (photoCount) parts.push(`${photoCount} photo${photoCount > 1 ? 's' : ''}`)
      if (l.video) parts.push('video tour')
      if (l.floor_plan) parts.push('floor plan')
      if (l.walkthrough_link) parts.push('360° walkthrough')
      return parts.length ? parts.join(', ') : 'None provided'
    },
  },
]

const CATEGORY_ORDER = ['Affordability', 'Location', 'Space & Comfort', 'Amenities', 'Trust & Transparency']

function winnerFor(criterion, listingA, listingB) {
  if (!criterion.better) return null // not a scored row
  const valA = criterion.getValue(listingA)
  const valB = criterion.getValue(listingB)
  if (valA == null || valB == null) return null
  if (valA === valB) return 'tie'
  if (criterion.better === 'lower') return valA < valB ? 'a' : 'b'
  return valA > valB ? 'a' : 'b'
}

function scoreComparison(listingA, listingB) {
  const categoryScores = {} // category -> { a: n, b: n }
  let totalA = 0
  let totalB = 0
  let scoredRows = 0

  CRITERIA.forEach(c => {
    const w = winnerFor(c, listingA, listingB)
    if (w === null) return
    scoredRows++
    if (!categoryScores[c.category]) categoryScores[c.category] = { a: 0, b: 0 }
    if (w === 'a') { totalA++; categoryScores[c.category].a++ }
    else if (w === 'b') { totalB++; categoryScores[c.category].b++ }
    // ties add to neither
  })

  return { categoryScores, totalA, totalB, scoredRows }
}

// ── Picker: search & select a listing to fill slot A or B ──────
function ListingPicker({ excludeId, onPick, label }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const runSearch = useCallback((term) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (term) params.set('search', term)
    fetch(`${BASE}/api/listings?${params.toString()}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setResults((json.data || []).filter(l => String(l.id) !== String(excludeId)).slice(0, 12))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [excludeId])

  useEffect(() => { runSearch('') }, [runSearch])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, runSearch])

  return (
    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/60 h-full">
      <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
        <i className="fa-solid fa-magnifying-glass text-blue-500"></i> {label}
      </p>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by title, area, or location..."
        className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Searching...
          </div>
        ) : results.length === 0 ? (
          <p className="text-center py-8 text-sm text-slate-400">No listings found.</p>
        ) : (
          results.map(l => (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              className="w-full flex items-center gap-3 bg-white border border-slate-100 hover:border-blue-300 hover:shadow-sm rounded-xl p-2.5 text-left transition-all"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                {l.photos ? (
                  <img src={`${BASE}/uploads/${l.photos.split(',')[0]}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <i className="fa-solid fa-house"></i>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{l.title}</p>
                <p className="text-xs text-slate-400 truncate">{[l.area, l.district].filter(Boolean).join(', ') || l.location}</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5">৳{Number(l.rent).toLocaleString()}/mo</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ── One listing's header (photo, title, price, change/remove) ──
function ListingHeader({ listing, onChange, isWinner }) {
  const photo = listing.photos ? listing.photos.split(',')[0] : null
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${isWinner ? 'border-emerald-400 shadow-md' : 'border-slate-100'}`}>
      <div className="relative h-40 bg-slate-100">
        {photo ? (
          <img src={`${BASE}/uploads/${photo}`} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <i className="fa-solid fa-house text-3xl"></i>
          </div>
        )}
        {isWinner && (
          <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
            <i className="fa-solid fa-trophy"></i> Better Match
          </span>
        )}
      </div>
      <div className="p-4">
        <Link to={`/listings/${listing.id}`} className="font-bold text-slate-800 hover:text-blue-700 leading-tight line-clamp-2 block mb-1">
          {listing.title}
        </Link>
        <p className="text-xs text-slate-400 mb-2 truncate">
          <i className="fa-solid fa-location-dot text-blue-500 mr-1"></i>
          {[listing.area, listing.district].filter(Boolean).join(', ') || listing.location}
        </p>
        <p className="text-xl font-black text-blue-800 mb-3">
          ৳{Number(listing.rent).toLocaleString()}<span className="text-slate-400 text-sm font-normal">/mo</span>
        </p>
        <div className="flex gap-2">
          <Link to={`/listings/${listing.id}`} className="flex-1 text-center text-xs font-semibold py-2 border border-blue-600 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
            View Listing
          </Link>
          <button onClick={onChange} className="flex-1 text-xs font-semibold py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">
            Change
          </button>
        </div>
      </div>
    </div>
  )
}

function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  const [listingA, setListingA] = useState(null)
  const [listingB, setListingB] = useState(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  const fetchListing = (id, setListing, setLoading) => {
    if (!id) { setListing(null); return }
    setLoading(true)
    fetch(`${BASE}/api/listings/${id}`)
      .then(r => r.json())
      .then(json => setListing(json.success ? json.data : null))
      .catch(() => setListing(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchListing(idA, setListingA, setLoadingA) }, [idA])
  useEffect(() => { fetchListing(idB, setListingB, setLoadingB) }, [idB])

  const pick = (slot, id) => {
    const next = new URLSearchParams(searchParams)
    next.set(slot, id)
    setSearchParams(next, { replace: false })
  }

  const clearSlot = (slot) => {
    const next = new URLSearchParams(searchParams)
    next.delete(slot)
    setSearchParams(next, { replace: false })
  }

  const bothLoaded = listingA && listingB
  const { categoryScores, totalA, totalB, scoredRows } = bothLoaded
    ? scoreComparison(listingA, listingB)
    : { categoryScores: {}, totalA: 0, totalB: 0, scoredRows: 0 }

  const overallWinner = bothLoaded ? (totalA > totalB ? 'a' : totalB > totalA ? 'b' : 'tie') : null

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
            <i className="fa-solid fa-scale-balanced text-blue-600 mr-2"></i>Compare Properties
          </h1>
          <p className="text-slate-500 text-sm">
            Pick two listings to see them side by side, and we'll suggest which one is the better overall match.
          </p>
        </div>

        {/* ── Selection row ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            {loadingA ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              </div>
            ) : listingA ? (
              <ListingHeader listing={listingA} onChange={() => clearSlot('a')} isWinner={overallWinner === 'a'} />
            ) : (
              <ListingPicker label="Property A" excludeId={idB} onPick={id => pick('a', id)} />
            )}
          </div>
          <div>
            {loadingB ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              </div>
            ) : listingB ? (
              <ListingHeader listing={listingB} onChange={() => clearSlot('b')} isWinner={overallWinner === 'b'} />
            ) : (
              <ListingPicker label="Property B" excludeId={idA} onPick={id => pick('b', id)} />
            )}
          </div>
        </div>

        {/* ── Verdict banner ────────────────────────────── */}
        {bothLoaded && (
          <div className={`rounded-2xl p-5 mb-8 border ${
            overallWinner === 'tie'
              ? 'bg-slate-50 border-slate-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            {overallWinner === 'tie' ? (
              <p className="text-slate-700 font-semibold flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-slate-400"></i>
                It's a close call — both properties are evenly matched on the features we could compare ({scoredRows} compared).
              </p>
            ) : (
              <div>
                <p className="text-emerald-800 font-bold flex items-center gap-2 mb-1">
                  <i className="fa-solid fa-circle-check"></i>
                  We'd suggest{' '}
                  <Link to={`/listings/${(overallWinner === 'a' ? listingA : listingB).id}`} className="underline decoration-2 underline-offset-2">
                    {(overallWinner === 'a' ? listingA : listingB).title}
                  </Link>
                </p>
                <p className="text-emerald-700 text-sm">
                  It wins on {overallWinner === 'a' ? totalA : totalB} out of {scoredRows} comparable features
                  {' '}({overallWinner === 'a' ? totalB : totalA} for the other property{scoredRows - totalA - totalB > 0 ? `, ${scoredRows - totalA - totalB} tied` : ''}).
                </p>
              </div>
            )}

            {/* Category chip breakdown */}
            <div className="flex flex-wrap gap-2 mt-3">
              {CATEGORY_ORDER.filter(cat => categoryScores[cat]).map(cat => {
                const { a, b } = categoryScores[cat]
                const catWinner = a > b ? 'a' : b > a ? 'b' : 'tie'
                return (
                  <span key={cat} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    catWinner === 'tie' ? 'bg-white text-slate-500 border-slate-200' :
                    catWinner === 'a' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'
                  }`}>
                    {cat}: {catWinner === 'tie' ? 'Tied' : catWinner === 'a' ? (listingA.title.length > 18 ? 'Property A' : listingA.title) : (listingB.title.length > 18 ? 'Property B' : listingB.title)}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Detailed comparison table ─────────────────── */}
        {bothLoaded && (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Sticky header with names */}
            <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-slate-50 border-b border-slate-100 sticky top-16 z-10">
              <div className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Feature</div>
              <div className="px-4 py-3 text-sm font-bold text-slate-800 truncate">{listingA.title}</div>
              <div className="px-4 py-3 text-sm font-bold text-slate-800 truncate">{listingB.title}</div>
            </div>

            {CATEGORY_ORDER.map(category => {
              const rows = CRITERIA.filter(c => c.category === category)
              if (rows.length === 0) return null
              return (
                <div key={category}>
                  <div className="px-4 py-2 bg-blue-50/50 text-xs font-bold text-blue-700 uppercase tracking-wide border-b border-slate-100">
                    {category}
                  </div>
                  {rows.map(c => {
                    const w = winnerFor(c, listingA, listingB)
                    return (
                      <div key={c.key} className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-slate-50 last:border-0">
                        <div className="px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                          <i className={`fa-solid ${c.icon} text-slate-400 w-4 text-center`}></i>
                          {c.label}
                        </div>
                        <div className={`px-4 py-3 text-sm flex items-center gap-1.5 ${w === 'a' ? 'font-bold text-emerald-700 bg-emerald-50/60' : 'text-slate-700'}`}>
                          {w === 'a' && <i className="fa-solid fa-check-circle text-emerald-500 text-xs"></i>}
                          {c.format(listingA)}
                        </div>
                        <div className={`px-4 py-3 text-sm flex items-center gap-1.5 ${w === 'b' ? 'font-bold text-emerald-700 bg-emerald-50/60' : 'text-slate-700'}`}>
                          {w === 'b' && <i className="fa-solid fa-check-circle text-emerald-500 text-xs"></i>}
                          {c.format(listingB)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {!bothLoaded && !loadingA && !loadingB && (
          <p className="text-center text-slate-400 text-sm mt-4">
            <i className="fa-solid fa-circle-info mr-1"></i>
            Choose a property on both sides to see the full comparison.
          </p>
        )}

      </div>
    </div>
  )
}

export default Compare