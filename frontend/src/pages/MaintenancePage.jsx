import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

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
  const APARTMENT_ID = 1 // Active apartment / roommate group ID

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
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    document.title = 'Service & Maintenance – Flatfolks'
    window.scrollTo(0, 0)
    fetchCatalog()
    fetchMaintenanceLogs()
  }, [])

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
      const res = await fetch(`http://localhost:8000/api/maintenance/logs/${APARTMENT_ID}`)
      const json = await res.json()
      if (json.success) setLogs(json.data)
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
      if (json.success) setTechnicians(json.data)
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
          apartment_id: APARTMENT_ID,
          user_id: 1,
          service_id: selectedService,
          technician_id: selectedTechnician.id,
          scheduled_date: scheduledDate,
          time_slot: timeSlot,
          problem_description: problemDescription,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg('Booking confirmed! Logged to shared apartment view.')
        setSelectedTechnician(null)
        setProblemDescription('')
        fetchMaintenanceLogs()
      } else {
        alert(json.message || 'Booking failed')
      }
    } catch (err) {
      alert('Error submitting booking')
    } finally {
      setSubmitting(false)
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
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
            <i className="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
            <span className="font-medium text-sm">{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: 3-Step Booking Wizard */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-3">
                <i className="fa-solid fa-location-dot mr-1.5"></i> Flat #4B ({selectedArea})
              </span>
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                Step 1: Select Service & Location
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area
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
                    <option value="Badda">Badda</option>
                    <option value="Aftabnagar">Aftabnagar</option>
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
          </div>

          {/* RIGHT: Shared Apartment Maintenance Log */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  Apartment Maintenance Log
                </h2>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {logs.length} Active Tickets
                </span>
              </div>

              {loadingLogs ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading shared tickets...</p>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-clipboard-check text-slate-300 text-3xl mb-2"></i>
                  <p className="text-xs text-slate-500">No active maintenance requests for this flat.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800">
                          {log.service_name}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          {log.status}
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
                        <p className="text-xs italic text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          "{log.problem_description}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
