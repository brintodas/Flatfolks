import { Link } from 'react-router-dom'

function MapPopupCard({ listing }) {
  const photoUrl = listing.photos 
    ? `http://localhost:8000/uploads/${listing.photos.split(',')[0]}`
    : null

  return (
    <div className="w-56 -m-3 overflow-hidden rounded-xl">
      <div className="h-32 bg-slate-200 relative">
        {photoUrl ? (
          <img src={photoUrl} className="w-full h-full object-cover" alt={listing.title} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <i className="fa-solid fa-house text-2xl mb-1"></i>
            <span className="text-xs">No Photo</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-white">
        <h4 className="font-bold text-slate-800 text-sm truncate mb-1">{listing.title}</h4>
        <p className="text-xs text-slate-500 mb-2 truncate">
          <i className="fa-solid fa-location-dot text-blue-500 mr-1"></i>
          {[listing.area, listing.district].filter(Boolean).join(', ') || listing.location}
        </p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-blue-800 text-sm">
            ৳{Number(listing.rent).toLocaleString()}
          </span>
          <Link
            to={`/listings/${listing.id}`}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default MapPopupCard
