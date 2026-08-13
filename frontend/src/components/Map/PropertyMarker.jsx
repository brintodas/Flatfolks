import { Marker, Popup } from 'react-leaflet'
import MapPopupCard from './MapPopupCard'
import L from 'leaflet'

// Fix the default icon path issues with Leaflet in React/Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
})

function PropertyMarker({ listing }) {
  if (!listing.lat || !listing.lng) return null
  
  return (
    <Marker position={[listing.lat, listing.lng]} icon={DefaultIcon}>
      <Popup className="custom-popup">
        <MapPopupCard listing={listing} />
      </Popup>
    </Marker>
  )
}

export default PropertyMarker
