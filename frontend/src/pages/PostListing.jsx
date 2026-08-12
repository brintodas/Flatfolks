import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function PostListing() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    rent: '',
    location: '',
    area: '',
    beds: '1',
    furnished: 'false',
    gender_preference: 'any',
    utilities_included: 'false',
    lease_duration: '',
    available_from: '',
    landlord_name: '',
    landlord_phone: '',
    walkthrough_link: '',
    property_type: 'entire_flat',
    distance_to_campus: '',
    advance_deposit: '',
    curfew_time: '',
    guests_allowed: 'true',
    smoking_allowed: 'false',
    has_wifi: 'false',
    has_generator: 'false',
    has_cctv: 'false',
    has_lift: 'false',
    has_fridge: 'false'
  })

  const [photos, setPhotos] = useState([])
  const [video, setVideo] = useState(null)
  const [floorPlan, setFloorPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [backendOk, setBackendOk] = useState(null) // null=checking, true=ok, false=down

  // check if backend is reachable when page loads
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    fetch('http://localhost:8000/api/ping', { signal: controller.signal })
      .then(res => res.json())
      .then(() => { clearTimeout(timeout); setBackendOk(true) })
      .catch(() => { clearTimeout(timeout); setBackendOk(false) })
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhotos = (e) => {
    setPhotos(e.target.files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const data = new FormData()

    // append all form fields
    Object.keys(form).forEach(key => {
      data.append(key, form[key])
    })

    // append photos
    for (let i = 0; i < photos.length; i++) {
      data.append('photos', photos[i])
    }

    // append video if exists
    if (video) {
      data.append('video', video)
    }

    // append floor plan if exists
    if (floorPlan) {
      data.append('floor_plan', floorPlan)
    }

    try {
      const res = await fetch('http://localhost:8000/api/listings', {
        method: 'POST',
        body: data
      })

      if (!res.ok) {
        setError(`Server error: ${res.status} ${res.statusText}`)
        setLoading(false)
        return
      }

      const json = await res.json()

      if (json.success) {
        setBackendOk(true)
        setSuccess('Listing posted successfully! Redirecting...')
        setTimeout(() => navigate('/listings'), 1500)
      } else {
        setError('Error: ' + (json.message || 'Something went wrong'))
      }
    } catch (err) {
      console.log('Fetch error:', err)
      setBackendOk(false)
      setError('❌ Cannot reach backend server on port 5000. Open a terminal and run: cd backend && node server.js')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Post a Listing</h1>
          <p className="text-slate-500 mt-1">Fill in your property details below</p>
        </div>

        {/* Backend status banner */}
        {backendOk === false && (
          <div className="bg-red-50 border border-red-300 text-red-800 text-sm px-4 py-3 rounded-xl mb-2">
            <strong>⚠️ Backend not running!</strong><br />
            Open a new terminal tab and run:<br />
            <code className="bg-red-100 px-2 py-0.5 rounded mt-1 inline-block">
              cd "/Users/brintodas/Downloads/CSE470 /backend" && node server.js
            </code>
          </div>
        )}
        {backendOk === true && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-2">
            ✅ Backend connected
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Listing Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. 2-BHK Furnished Flat in Dhanmondi"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Rent + Beds row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monthly Rent (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="rent"
                value={form.rent}
                onChange={handleChange}
                placeholder="e.g. 12000"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Beds</label>
              <select
                name="beds"
                value={form.beds}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="1">1 Bed</option>
                <option value="2">2 Beds</option>
                <option value="3">3 Beds</option>
                <option value="4">4+ Beds</option>
              </select>
            </div>
          </div>

          {/* Location + Area */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Road 5, Dhanmondi"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Area / Neighbourhood</label>
              <input
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="e.g. Dhanmondi"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the property — floor, nearby landmarks, condition, etc."
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Furnished + Utilities */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Furnished?</label>
              <select
                name="furnished"
                value={form.furnished}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="false">Unfurnished</option>
                <option value="true">Furnished</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Utilities Included?</label>
              <select
                name="utilities_included"
                value={form.utilities_included}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="false">No</option>
                <option value="true">Yes (WiFi, Gas, Water)</option>
              </select>
            </div>
          </div>

          {/* Gender + Lease */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender Preference</label>
              <select
                name="gender_preference"
                value={form.gender_preference}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="any">Any</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lease Duration</label>
              <select
                name="lease_duration"
                value={form.lease_duration}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select</option>
                <option value="1 month">1 Month</option>
                <option value="3 months">3 Months</option>
                <option value="6 months">6 Months</option>
                <option value="1 year">1 Year</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Available From */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Available From</label>
            <input
              type="date"
              name="available_from"
              value={form.available_from}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Property Type + Distance to Campus */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
              <select
                name="property_type"
                value={form.property_type}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="entire_flat">Entire Flat</option>
                <option value="single_room">Single Room</option>
                <option value="shared_room">Shared Room / Seat</option>
                <option value="sublet">Sublet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance to Campus</label>
              <input
                type="text"
                name="distance_to_campus"
                value={form.distance_to_campus}
                onChange={handleChange}
                placeholder="e.g. 5 mins walk"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Advance Deposit + Curfew */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Advance Deposit</label>
              <input
                type="text"
                name="advance_deposit"
                value={form.advance_deposit}
                onChange={handleChange}
                placeholder="e.g. 2 months rent"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gate Curfew Time</label>
              <input
                type="text"
                name="curfew_time"
                value={form.curfew_time}
                onChange={handleChange}
                placeholder="e.g. 10:00 PM or None"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Rules */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Guests Allowed?</label>
              <select
                name="guests_allowed"
                value={form.guests_allowed}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Smoking Allowed?</label>
              <select
                name="smoking_allowed"
                value={form.smoking_allowed}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>

          {/* Amenities checkboxes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Amenities</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {[
                { key: 'has_wifi', label: 'WiFi' },
                { key: 'has_generator', label: 'Generator' },
                { key: 'has_cctv', label: 'CCTV' },
                { key: 'has_lift', label: 'Lift' },
                { key: 'has_fridge', label: 'Fridge' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key] === 'true'}
                    onChange={e => setForm({ ...form, [key]: e.target.checked ? 'true' : 'false' })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Landlord info */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Your Contact Info</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  name="landlord_name"
                  value={form.landlord_name}
                  onChange={handleChange}
                  placeholder="Full name"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="landlord_phone"
                  value={form.landlord_phone}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Rich Media Section */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Property Media</p>
            
            {/* Photos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Photos <span className="text-slate-400 font-normal">(up to 5 images)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {photos.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{photos.length} photo(s) selected</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Floor Plan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Floor Plan <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFloorPlan(e.target.files[0])}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Video Tour */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Video Tour <span className="text-slate-400 font-normal">(mp4/webm, max 100MB)</span>
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => setVideo(e.target.files[0])}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>

            {/* 360 Walkthrough Link */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                360° Walkthrough Link <span className="text-slate-400 font-normal">(Matterport / YouTube 360)</span>
              </label>
              <input
                type="url"
                name="walkthrough_link"
                value={form.walkthrough_link}
                onChange={handleChange}
                placeholder="https://my.matterport.com/show/?m=..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting...' : 'Post Listing'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default PostListing
