import { useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import PropertyMarker from './PropertyMarker'

// Helper to generate a deterministically random coordinate around Dhaka for properties without lat/lng
function generateMockCoordinates(id) {
  // Dhaka center
  const centerLat = 23.8103
  const centerLng = 90.4125
  
  // Use id to seed pseudo-randomness so pins don't jump around on re-render
  const numId = typeof id === 'number' ? id : String(id).charCodeAt(0)
  
  const latOffset = ((numId * 13) % 100) / 1000 - 0.05
  const lngOffset = ((numId * 17) % 100) / 1000 - 0.05
  
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset
  }
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

function InteractiveMap({ listings }) {
  // Ensure every listing has a lat/lng for demonstration purposes
  const mapListings = useMemo(() => {
    return listings.map(listing => {
      if (listing.lat && listing.lng) return listing
      
      const coords = generateMockCoordinates(listing.id)
      return { ...listing, lat: coords.lat, lng: coords.lng }
    })
  }, [listings])

  // Center on Dhaka
  const position = [23.8103, 90.4125]

  return (
    <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer 
        center={position} 
        zoom={12} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full"
      >
        <ResizeMap />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mapListings.map(listing => (
          <PropertyMarker key={listing.id} listing={listing} />
        ))}
      </MapContainer>

      {/* Add global styles to fix leaflet popup spacing / margins overriding our Tailwind classes */}
      <style>{`
        .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 0.75rem;
        }
        .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
      `}</style>
    </div>
  )
}

export default InteractiveMap
