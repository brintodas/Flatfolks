import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const DHAKA_AREAS = [
  'Badda',
  'Aftabnagar',
  'Banani',
  'Gulshan',
  'Dhanmondi',
  'Bashundhara',
  'Mirpur',
  'Uttara',
  'Mohakhali',
  'Khilgaon',
  'Malibagh',
  'Rampura',
  'Mohammadpur',
  'Lalmatia',
  'Baridhara',
  'Nikunja',
  'Farmgate',
  'Panthapath',
  'Shantinagar',
  'Bailey Road',
  'Wari',
  'Old Dhaka',
  'Mogbazar',
  'Tejgaon',
  'Cantonment',
  'Elephant Road',
  'Segunbagicha',
  'Motijheel',
  'Kakrail',
  'Khilkhet',
]

const LOG_STATUS_STYLES = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
}

const LOG_STATUS_LABELS = {
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}

const BANGLA_TIME_SLOTS = [
  { value: 'জোহরের আগে', label: 'জোহরের আগে (Before Dhuhr)' },
  { value: 'জোহরের পরে', label: 'জোহরের পরে (After Dhuhr)' },
  { value: 'আসরের আগে', label: 'আসরের আগে (Before Asr)' },
  { value: 'আসরের পরে', label: 'আসরের পরে (After Asr)' },
  { value: 'মাগরিবের আগে', label: 'মাগরিবের আগে (Before Maghrib)' },
  { value: 'মাগরিবের পরে', label: 'মাগরিবের পরে (After Maghrib)' },
  { value: 'এশার আগে', label: 'এশার আগে (Before Isha)' },
  { value: 'এশার পরে', label: 'এশার পরে (After Isha)' },
]

export default function MaintenancePage() {
  const navigate = useNavigate()

  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem('ff_user') || 'null')
  )
  const [userGroup, setUserGroup] = useState(null)
  const [loadingGroup, setLoadingGroup] = useState(true)

  // Form State
  const [catalog, setCatalog] = useState([])
  const [selectedArea, setSelectedArea] = useState('Badda')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [availableServices, setAvailableServices] = useState([])

  // Step 2 & 3 State
  const [technicians, setTechnicians] = useState([])
  const [selectedTechnician, setSelectedTechnician] = useState(null)
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [timeSlot, setTimeSlot] = useState(BANGLA_TIME_SLOTS[0].value)
  const [problemDescription, setProblemDescription] = useState('')

  // UI state
  const [loadingTechs, setLoadingTechs] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  // Register Living Space Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    apartment_name: '',
    address: '',
    area: 'Badda',
    monthly_rent: '',
    bedrooms: '2',
    bathrooms: '2',
    kitchens: '1',
    size_sqft: '1000',
    contact_phone: currentUser?.phone || '',
  })
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')

  useEffect(() => {
    document.title = 'Service & Maintenance – Flatfolks'
    window.scrollTo(0, 0)
    fetchCatalog()
    fetchUserGroup()
    fetchMaintenanceLogs()
  }, [])

  const fetchUserGroup = async () => {
    if (!currentUser?.id) {
      setLoadingGroup(false)
      return
    }
    try {
      const res = await fetch(`http://localhost:8000/api/roommates/my-group?user_id=${currentUser.id}`)
      const json = await res.json()
      if (json.success && json.group) {
        setUserGroup(json.group)
      } else {
        // Also check if user has active tenancy
        const tRes = await fetch(`http://localhost:8000/api/landlord/tenancies/student/${currentUser.id}`)
        const tJson = await tRes.json().catch(() => ({}))
        if (tJson.success && tJson.tenancy) {
          setUserGroup({
            id: tJson.tenancy.id,
            name: tJson.tenancy.listing_title || `Flat in ${tJson.tenancy.area}`,
            isTenancy: true,
          })
        }
      }
    } catch (err) {
      console.error('Failed to load user group:', err)
    } finally {
      setLoadingGroup(false)
    }
  }

  // Handle Living Space Registration Submission
  const handleRegisterLivingSpace = async (e) => {
    e.preventDefault()
    if (!currentUser?.id) return
    setRegistering(true)
    setRegisterError('')

    try {
      const res = await fetch('http://localhost:8000/api/maintenance/register-living-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          apartment_name: registerForm.apartment_name,
          address: registerForm.address,
          area: registerForm.area,
          monthly_rent: Number(registerForm.monthly_rent),
          bedrooms: Number(registerForm.bedrooms) || 1,
          bathrooms: Number(registerForm.bathrooms) || 1,
          kitchens: Number(registerForm.kitchens) || 1,
          size_sqft: Number(registerForm.size_sqft) || null,
          contact_phone: registerForm.contact_phone,
        }),
      })
      const json = await res.json()
      if (json.success && json.group) {
        setUserGroup(json.group)
        setSelectedArea(json.group.area || registerForm.area)
        setShowRegisterModal(false)
        setSuccessMsg('Living space registered successfully! You can now book technicians and maintenance services.')
      } else {
        setRegisterError(json.message || 'Failed to register living space.')
      }
    } catch (err) {
      console.error('Error registering flat:', err)
      setRegisterError('Network error while registering living space.')
    } finally {
      setRegistering(false)
    }
  }

  const fetchCatalog = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/maintenance/catalog')
      const json = await res.json()
      if (json.success) setCatalog(json.data)
    } catch (err) {
      console.error('Failed to load catalog:', err)
    }
  }

  const fetchMaintenanceLogs = async () => {
    setLoadingLogs(true)
    try {
      const userParam = currentUser?.id ? `?user_id=${currentUser.id}` : ''
      const res = await fetch(`http://localhost:8000/api/maintenance/logs${userParam}`)
      const json = await res.json()
      if (json.success) setLogs(json.data || [])
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  // Handle Category Change
  const handleCategoryChange = (e) => {
    const catId = e.target.value
    setSelectedCategory(catId)
    setSelectedService('')
    setSelectedTechnician(null)
    setTechnicians([])

    const matchedCat = catalog.find((c) => String(c.id) === String(catId))
    setAvailableServices(matchedCat ? matchedCat.services : [])
  }

  // Step 1 -> 2: Fetch Technicians
  const handleFindTechnicians = async () => {
    if (!selectedCategory || !selectedService) return
    setLoadingTechs(true)
    setSelectedTechnician(null)

    try {
      const res = await fetch(
        `http://localhost:8000/api/maintenance/technicians?area=${encodeURIComponent(
          selectedArea
        )}&category_id=${selectedCategory}`
      )
      const json = await res.json()
      if (json.success) setTechnicians(json.data || [])
    } catch (err) {
      console.error('Failed to load technicians:', err)
    } finally {
      setLoadingTechs(false)
    }
  }

  // Step 3: Submit Booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTechnician) return
    setSubmitting(true)
    setSuccessMsg('')

    try {
      const res = await fetch('http://localhost:8000/api/maintenance/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartment_id: userGroup?.id || 1,
          user_id: currentUser?.id || 1,
          service_id: selectedService,
          technician_id: selectedTechnician.id,
          scheduled_date: scheduledDate,
          time_slot: timeSlot,
          problem_description: problemDescription,
        }),
      })
      const json = await res.json()
      if (json.success) {
        // Booking is now PENDING_PAYMENT — redirect student to payments to complete
        const params = new URLSearchParams({
          service_type: 'maintenance',
          reference_id: json.booking_id,
          amount: json.estimated_cost || 0,
          title: json.service_name || 'Maintenance Service',
        })
        navigate(`/payments?${params.toString()}`)
      } else {
        alert(json.message || 'Booking failed')
      }
    } catch (err) {
      alert('Error submitting booking')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete / Cancel Booking
  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this maintenance booking?')) {
      return
    }
    setDeletingId(bookingId)
    try {
      const userParam = currentUser?.id ? `?user_id=${currentUser.id}` : ''
      const res = await fetch(`http://localhost:8000/api/maintenance/bookings/${bookingId}${userParam}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg('Maintenance booking deleted successfully.')
        setLogs((prev) => prev.filter((item) => item.id !== bookingId))
      } else {
        alert(json.message || 'Failed to delete booking.')
      }
    } catch (err) {
      console.error('Error deleting booking:', err)
      alert('Failed to delete booking.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto mb-4">
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/" className="hover:text-blue-700 transition-colors">
            Home
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <Link to="/roommates" className="hover:text-blue-700 transition-colors">
            Apartment
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="text-slate-800 font-semibold">Service & Maintenance</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Apartment Service & Maintenance
          </h1>
          <p className="text-sm text-slate-500">
            Book trusted on-call technicians with prayer-time based localized slots for your flat.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
              <span className="font-medium text-sm">{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg('')}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: 3-Step Booking Wizard OR No Flat Warning */}
          <div className="lg:col-span-7 space-y-6">
            {loadingGroup ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-3xl mb-3"></i>
                <p className="text-sm font-medium text-slate-500">Checking your flat registration...</p>
              </div>
            ) : !currentUser ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <i className="fa-solid fa-user-lock text-blue-600 text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Sign In Required
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                  Please sign in to your Flatfolks student account and verify your flat to request repairs and book on-call technicians.
                </p>
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-sm"
                >
                  <i className="fa-solid fa-right-to-bracket text-xs"></i>
                  Sign In to Your Account
                </Link>
              </div>
            ) : !userGroup ? (
              /* User is logged in but has no registered flat or roommate group */
              <div className="bg-white rounded-2xl border border-amber-200/80 p-8 sm:p-10 text-center shadow-sm relative overflow-hidden">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <i className="fa-solid fa-house-chimney-crack text-amber-500 text-2xl"></i>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/70 text-amber-800 mb-3 border border-amber-200/60">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5 text-[11px]"></i>
                  Living Place Not Registered
                </span>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Register Your Living Place to Access Maintenance
                </h2>
                <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
                  You do not live in a registered flat on Flatfolks yet. Register your apartment details below or join a roommate flat to request repairs and on-call technicians.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-house-circle-check text-xs"></i>
                    Register Your Living Space
                  </button>
                  <Link
                    to="/roommates"
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-user-group text-xs"></i>
                    Find Roommates & Form Flat
                  </Link>
                  <Link
                    to="/listings"
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    Browse Available Listings
                  </Link>
                </div>
              </div>
            ) : (
              /* User lives in a flat -> Full booking wizard */
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-3">
                    <i className="fa-solid fa-location-dot mr-1.5"></i>
                    {userGroup?.name ? `${userGroup.name} (${selectedArea})` : `Flat Area: ${selectedArea}`}
                  </span>
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Step 1: Select Service & Location
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Area in Dhaka
                      </label>
                      <select
                        value={selectedArea}
                        onChange={(e) => {
                          setSelectedArea(e.target.value)
                          setTechnicians([])
                          setSelectedTechnician(null)
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                      >
                        {DHAKA_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Service Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">-- Choose Category --</option>
                        {catalog.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {availableServices.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Specific Repair / Service
                      </label>
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">-- Choose Specific Problem --</option>
                        {availableServices.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleFindTechnicians}
                    disabled={!selectedCategory || !selectedService || loadingTechs}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                  >
                    {loadingTechs ? 'Finding local technicians...' : 'Find Available Technicians'}
                  </button>
                </div>

                {/* STEP 2: Available Technicians */}
                {technicians.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">
                      Step 2: Available Technicians in {selectedArea}
                    </h2>
                    <div className="space-y-3">
                      {technicians.map((tech) => (
                        <div
                          key={tech.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                            selectedTechnician?.id === tech.id
                              ? 'border-blue-600 bg-blue-50/50'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-800 text-sm">{tech.name}</h4>
                              <span className="text-xs text-amber-500 font-bold">
                                ★ {tech.rating}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              <i className="fa-solid fa-phone mr-1 text-[10px]"></i> {tech.phone} |{' '}
                              <i className="fa-solid fa-location-dot mr-1 text-[10px]"></i> {tech.area}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedTechnician(tech)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                              selectedTechnician?.id === tech.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {selectedTechnician?.id === tech.id ? 'Selected' : 'Book Now'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Culturally Localized Bangla Slots & Confirmation */}
                {selectedTechnician && (
                  <form
                    onSubmit={handleBookingSubmit}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
                  >
                    <h2 className="text-lg font-bold text-slate-800">
                      Step 3: Choose Prayer-Time Slot & Confirm
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Time Slot (সময় নির্ধারণ)
                        </label>
                        <select
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600"
                        >
                          {BANGLA_TIME_SLOTS.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Problem Notes for Roommates & Technician
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Master bathroom tap is leaking continuously..."
                        value={problemDescription}
                        onChange={(e) => setProblemDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {submitting ? 'Confirming...' : 'Confirm Booking & Notify Roommates'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* RIGHT: Shared Apartment Maintenance Log */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Apartment Maintenance Log
                  </h2>
                  <p className="text-xs text-slate-400">
                    {userGroup?.name ? `Shared with ${userGroup.name}` : 'Your flat service requests'}
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full">
                  {logs.length} Active {logs.length === 1 ? 'Ticket' : 'Tickets'}
                </span>
              </div>

              {loadingLogs ? (
                <div className="text-center py-10">
                  <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-2xl mb-2"></i>
                  <p className="text-xs text-slate-400">Loading maintenance log...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                  <i className="fa-solid fa-clipboard-check text-slate-300 text-3xl mb-2"></i>
                  <p className="text-sm font-semibold text-slate-600">No active maintenance requests</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Book a service on the left to schedule repairs for your flat.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-800">
                          {log.service_name}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${LOG_STATUS_STYLES[log.status] || 'bg-slate-100 text-slate-600'}`}>
                          {LOG_STATUS_LABELS[log.status] || log.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <i className="fa-regular fa-clock text-blue-600"></i>
                        <span className="font-semibold text-blue-700">{log.time_slot}</span>
                        <span className="text-slate-400">({new Date(log.scheduled_date).toLocaleDateString()})</span>
                      </div>

                      <div className="text-xs text-slate-500">
                        <span className="font-medium">Technician:</span> {log.technician_name} ({log.technician_phone})
                      </div>

                      {log.problem_description && (
                        <p className="text-xs italic text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                          "{log.problem_description}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                          <i className="fa-solid fa-user-circle text-slate-400 text-xs"></i>
                          {currentUser?.id && log.requested_by_user_id === currentUser.id ? (
                            <span className="text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              Booked by You
                            </span>
                          ) : (
                            <span>Booked by {log.requested_by_name || 'Flatmate'}</span>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(log.id)}
                          disabled={deletingId === log.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete booking"
                        >
                          {deletingId === log.id ? (
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                          ) : (
                            <i className="fa-regular fa-trash-can text-xs"></i>
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* REGISTER LIVING SPACE MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <i className="fa-solid fa-house-circle-check text-sm"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Register Your Living Space
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add your flat details to enable on-call repair services
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterLivingSpace} className="p-6 space-y-4">
              {registerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
                  <span>{registerError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apartment / Flat Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Green View Flat 4B"
                    value={registerForm.apartment_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, apartment_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area in Dhaka <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={registerForm.area}
                    onChange={(e) => setRegisterForm({ ...registerForm, area: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  >
                    {DHAKA_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Address of Apartment <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House 14, Road 7/A, Block C, Badda, Dhaka"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Rent (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    required
                    placeholder="e.g. 18000"
                    value={registerForm.monthly_rent}
                    onChange={(e) => setRegisterForm({ ...registerForm, monthly_rent: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approximate Size (sq ft)
                  </label>
                  <input
                    type="number"
                    min="100"
                    placeholder="e.g. 1200"
                    value={registerForm.size_sqft}
                    onChange={(e) => setRegisterForm({ ...registerForm, size_sqft: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Rooms breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={registerForm.bedrooms}
                    onChange={(e) => setRegisterForm({ ...registerForm, bedrooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={registerForm.bathrooms}
                    onChange={(e) => setRegisterForm({ ...registerForm, bathrooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kitchens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={registerForm.kitchens}
                    onChange={(e) => setRegisterForm({ ...registerForm, kitchens: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01712-345678"
                  value={registerForm.contact_phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, contact_phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {registering ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Confirm & Register Apartment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}