import { useState } from 'react'

const listings = [
  {
    id: 1,
    title: 'Modern 2-BHK Flat',
    area: 'Dhanmondi',
    distance: '1.2 km from BRACU',
    price: '৳14,500',
    rating: 4.9,
    reviews: 47,
    badge: { text: '✔ Verified', color: 'bg-green-500' },
    tags: [
      { text: 'Furnished', color: 'bg-blue-50 text-blue-700' },
      { text: 'WiFi Incl.', color: 'bg-blue-50 text-blue-700' },
      { text: '2 Beds', color: 'bg-slate-100 text-slate-600' },
    ],
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=75',
  },
  {
    id: 2,
    title: 'Cozy Studio Flat',
    area: 'Mirpur',
    distance: '2.0 km from UIU',
    price: '৳8,200',
    rating: 4.7,
    reviews: 31,
    badge: { text: '🔥 Hot Deal', color: 'bg-orange-500' },
    tags: [
      { text: 'Furnished', color: 'bg-blue-50 text-blue-700' },
      { text: 'Bills Incl.', color: 'bg-green-50 text-green-700' },
      { text: '1 Bed', color: 'bg-slate-100 text-slate-600' },
    ],
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=75',
  },
  {
    id: 3,
    title: 'Girls-Only Shared Flat',
    area: 'Uttara',
    distance: 'Near NSU',
    price: '৳6,000',
    rating: 4.8,
    reviews: 62,
    badge: { text: '✔ Verified', color: 'bg-green-500' },
    tags: [
      { text: 'Girls Only', color: 'bg-pink-50 text-pink-700' },
      { text: 'WiFi Incl.', color: 'bg-blue-50 text-blue-700' },
      { text: 'Shared', color: 'bg-slate-100 text-slate-600' },
    ],
    img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=75',
  },
  {
    id: 4,
    title: 'Spacious 3-BHK Flat',
    area: 'Bashundhara',
    distance: '0.8 km from BRAC',
    price: '৳22,000',
    rating: 4.6,
    reviews: 18,
    badge: { text: '✨ New', color: 'bg-purple-500' },
    tags: [
      { text: 'Semi-Furnished', color: 'bg-blue-50 text-blue-700' },
      { text: '3 Beds', color: 'bg-slate-100 text-slate-600' },
      { text: 'Parking', color: 'bg-green-50 text-green-700' },
    ],
    img: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=600&q=75',
  },
]

const PropertyCard = ({ listing }) => {
  const [wishlisted, setWishlisted] = useState(false)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      {/* Image */}
      <div className="relative overflow-hidden h-52">
        <img src={listing.img} alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            e.target.parentElement.style.background = 'linear-gradient(135deg,#bfdbfe,#1e40af)'
            e.target.style.display = 'none'
          }} />
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 ${listing.badge.color} text-white text-xs font-bold rounded-lg`}>
            {listing.badge.text}
          </span>
        </div>
        <button onClick={() => setWishlisted(!wishlisted)}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm transition-colors"
          style={{ backdropFilter: 'blur(8px)' }}>
          <i className={`${wishlisted ? 'fa-solid text-red-500' : 'fa-regular text-slate-400 hover:text-red-500'} fa-heart`}></i>
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
          <span className="text-white text-xs font-semibold bg-blue-700 px-2 py-0.5 rounded">
            📍 {listing.area}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-bold text-slate-800 text-base leading-tight">{listing.title}</h3>
          <div className="flex items-center gap-1 text-sm ml-2 flex-shrink-0">
            <i className="fa-solid fa-star text-yellow-400 text-xs"></i>
            <span className="font-semibold text-slate-700">{listing.rating}</span>
            <span className="text-slate-400 text-xs">({listing.reviews})</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm mb-3 flex items-center gap-1">
          <i className="fa-solid fa-location-dot text-xs text-blue-500"></i>
          {listing.distance}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {listing.tags.map((tag, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tag.color}`}>
              {tag.text}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-black text-blue-800">{listing.price}</span>
            <span className="text-slate-400 text-sm">/month</span>
          </div>
          <button className="text-xs px-3 py-1.5 border-2 border-blue-600 text-blue-700 font-semibold rounded-lg hover:bg-blue-600 hover:text-white transition-all">
            View
          </button>
        </div>
      </div>
    </div>
  )
}

const FeaturedListings = () => {
  return (
    <section id="listings" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-2">Handpicked For You</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Featured Listings</h2>
            <p className="text-slate-500 mt-2">All listings are verified by our admin team.</p>
          </div>
          <a href="#" className="hidden sm:flex items-center gap-2 text-blue-700 font-semibold hover:underline">
            View all listings <i className="fa-solid fa-arrow-right text-xs"></i>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map(listing => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className="text-center mt-10">
          <a href="#" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-700 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all">
            Explore All Listings <i className="fa-solid fa-arrow-right text-sm"></i>
          </a>
        </div>
      </div>
    </section>
  )
}

export default FeaturedListings
