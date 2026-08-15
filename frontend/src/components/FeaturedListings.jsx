import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const PropertyCard = ({ listing }) => {
  const [wishlisted, setWishlisted] = useState(false)
  
  const imgUrl = listing.photos ? `http://localhost:8000/uploads/${listing.photos.split(',')[0]}` : 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'
  const badge = listing.is_verified ? { text: '✔ Verified', color: 'bg-green-500' } : { text: '✨ New', color: 'bg-purple-500' }
  
  const tags = []
  if (listing.furnished) tags.push({ text: 'Furnished', color: 'bg-blue-50 text-blue-700' })
  if (listing.utilities_included) tags.push({ text: 'Bills Incl.', color: 'bg-green-50 text-green-700' })
  if (listing.gender_preference === 'female') tags.push({ text: 'Girls Only', color: 'bg-pink-50 text-pink-700' })
  tags.push({ text: `${listing.beds || 1} Bed${listing.beds > 1 ? 's' : ''}`, color: 'bg-slate-100 text-slate-600' })

  const distance = listing.distance_to_campus ? `${listing.distance_to_campus} km from Campus` : (listing.location || 'Near Campus')

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      {/* Image */}
      <div className="relative overflow-hidden h-52">
        <img src={imgUrl} alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            e.target.parentElement.style.background = 'linear-gradient(135deg,#bfdbfe,#1e40af)'
            e.target.style.display = 'none'
          }} />
        <button onClick={() => setWishlisted(!wishlisted)}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm transition-colors"
          style={{ backdropFilter: 'blur(8px)' }}>
          <i className={`${wishlisted ? 'fa-solid text-red-500' : 'fa-regular text-slate-400 hover:text-red-500'} fa-heart`}></i>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col h-[180px]">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-bold text-slate-800 text-base leading-tight truncate mr-2">{listing.title}</h3>
          <div className="flex items-center gap-1 text-sm flex-shrink-0">
            <i className="fa-solid fa-star text-yellow-400 text-xs"></i>
            <span className="font-semibold text-slate-700">4.8</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm mb-3 flex items-center gap-1 truncate">
          <i className="fa-solid fa-location-dot text-xs text-blue-500"></i>
          {distance}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3 overflow-hidden h-[24px]">
          {tags.map((tag, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tag.color}`}>
              {tag.text}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-xl font-black text-blue-800">৳{listing.rent?.toLocaleString()}</span>
            <span className="text-slate-400 text-sm">/mo</span>
          </div>
          <Link to={`/listings/${listing.id}`} className="text-xs px-3 py-1.5 border-2 border-blue-600 text-blue-700 font-semibold rounded-lg hover:bg-blue-600 hover:text-white transition-all">
            View
          </Link>
        </div>
      </div>
    </div>
  )
}

const FeaturedListings = () => {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let areaParam = ''
    try {
      const user = JSON.parse(localStorage.getItem('ff_user'))
      if (user && user.preferred_area) {
        areaParam = `?area=${encodeURIComponent(user.preferred_area)}`
      }
    } catch (e) {
      console.error(e)
    }

    fetch(`http://localhost:8000/api/listings/featured${areaParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setListings(data.data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) return null

  if (listings.length === 0) return null

  return (
    <section id="listings" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-2">Handpicked For You</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Featured Listings</h2>
          </div>
          <Link to="/listings" className="hidden sm:flex items-center gap-2 text-blue-700 font-semibold hover:underline">
            View all listings <i className="fa-solid fa-arrow-right text-xs"></i>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map(listing => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/listings" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-700 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all">
            Explore All Listings <i className="fa-solid fa-arrow-right text-sm"></i>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default FeaturedListings
