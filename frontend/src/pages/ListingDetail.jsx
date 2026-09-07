import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import FraudReportForm from '../components/FraudReportForm'
import ReviewSection from '../components/reviews/ReviewSection'

function ListingDetail() {
  const { id } = useParams()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [showFraudReportForm, setShowFraudReportForm] = useState(false)
  const [verifiedReports, setVerifiedReports] = useState([])
  const [userGroup, setUserGroup] = useState(null)
  const [bookingMode, setBookingMode] = useState(() => sessionStorage.getItem('ff_search_mode') || 'group')
  const [linkCopied, setLinkCopied] = useState(false)
  const handleShare = async () => {
  const shareData = {
    title: listing?.title || 'Flatfolks Listing',
    text: listing
      ? `Check out this flat: ${listing.title}`
      : 'Check out this flat on Flatfolks',
    url: window.location.href
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error('Share failed:', err)
    }
  }
}

const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  } catch (err) {
    console.error('Copy link failed:', err)
  }
}
  // ── Application state ──
  const [application, setApplication]         = useState(null)  // null = not applied, obj = applied
  const [appLoading, setAppLoading]            = useState(false)
  const [showApplyModal, setShowApplyModal]    = useState(false)
  const [applyMoveIn, setApplyMoveIn]          = useState('')
  const [applyNotes, setApplyNotes]            = useState('')
  const [guarantorName, setGuarantorName]      = useState('')
  const [guarantorPhone, setGuarantorPhone]    = useState('')
  const [guarantorRelation, setGuarantorRel]   = useState('')
  const [rentPayer, setRentPayer]              = useState('self')
  const [expectedDuration, setExpectedDuration]= useState('6 months')
  const [emergencyName, setEmergencyName]      = useState('')
  const [emergencyPhone, setEmergencyPhone]    = useState('')
  const [idDoc, setIdDoc]                      = useState(null)
  const [agreeRules, setAgreeRules]            = useState(false)
  const [applySubmitting, setApplySubmitting]  = useState(false)
  const [applyToast, setApplyToast]            = useState(null)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') return
    fetch(`http://localhost:8000/api/roommates/my-group?user_id=${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.group) {
          setUserGroup(data.group)
        }
      })
      .catch(() => {})
  }, [currentUser?.id])

  useEffect(() => {
    fetch(`http://localhost:8000/api/listings/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setListing(json.data)
        else setError('Listing not found')
        setLoading(false)
      })
      .catch(() => { setError('Could not connect to server'); setLoading(false) })
  }, [id])

  useEffect(() => {
    fetch(`http://localhost:8000/api/reports/listing/${id}`)
      .then(res => res.json())
      .then(json => {
         if (json.success) {
           setVerifiedReports(json.reports || [])
         }
       })
      .catch(() => {
        setVerifiedReports([])
      })
 }, [id])

  // ── Check if student already applied ──
  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'student') return
    setAppLoading(true)
    fetch(`http://localhost:8000/api/listings/${id}/my-application?user_id=${currentUser.id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setApplication(data.application) })
      .catch(() => {})
      .finally(() => setAppLoading(false))
  }, [id, currentUser?.id])

  const submitApply = async () => {
    if (!applyMoveIn) { setApplyToast({ type: 'error', msg: 'Please select a move-in date.' }); return }
    if (!guarantorName || !guarantorPhone || !emergencyName || !emergencyPhone) {
      setApplyToast({ type: 'error', msg: 'Please fill in all required contact fields.' }); return
    }
    if (!agreeRules) { setApplyToast({ type: 'error', msg: 'You must agree to the house rules.' }); return }
    
    setApplySubmitting(true)
    try {
      const formData = new FormData()
      formData.append('student_id', currentUser.id)
      formData.append('move_in_date', applyMoveIn)
      formData.append('notes', applyNotes)
      formData.append('guarantor_name', guarantorName)
      formData.append('guarantor_phone', guarantorPhone)
      formData.append('guarantor_relation', guarantorRelation)
      formData.append('rent_payer', rentPayer)
      formData.append('expected_duration', expectedDuration)
      formData.append('emergency_contact_name', emergencyName)
      formData.append('emergency_contact_phone', emergencyPhone)
      formData.append('agreed_to_rules', agreeRules)
      if (idDoc) formData.append('id_document', idDoc)

      const res = await fetch(`http://localhost:8000/api/listings/${id}/apply`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setApplication({ status: 'pending', move_in_date: applyMoveIn, notes: applyNotes })
        setShowApplyModal(false)
        setApplyToast({ type: 'success', msg: data.message })
      } else {
        setApplyToast({ type: 'error', msg: data.message })
      }
    } catch { setApplyToast({ type: 'error', msg: 'Network error. Please try again.' }) }
    finally { setApplySubmitting(false) }
    setTimeout(() => setApplyToast(null), 5000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">Loading listing...</p>
      </div>
    </div>
  )

  if (error || !listing) return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-16 gap-4">
      <i className="fa-solid fa-triangle-exclamation text-3xl text-slate-300"></i>
      <p className="text-slate-600">{error || 'Something went wrong.'}</p>
      <Link to="/listings" className="text-blue-600 hover:underline text-sm">← Back to listings</Link>
    </div>
  )

  const photos = listing.photos ? listing.photos.split(',').filter(p => p.trim()) : []
  const BASE = 'http://localhost:8000/uploads'

  const genderColor = listing.gender_preference === 'female' ? '#db2777' :
                      listing.gender_preference === 'male'   ? '#2563eb' : '#16a34a'
  const genderLabel = listing.gender_preference === 'any'    ? 'All Welcome' :
                      listing.gender_preference === 'female' ? 'Girls Only' : 'Boys Only'

  const amenities = [
    { key: 'has_wifi',      icon: 'fa-wifi',           label: 'WiFi'      },
    { key: 'has_generator', icon: 'fa-bolt',           label: 'Generator' },
    { key: 'has_cctv',      icon: 'fa-video',          label: 'CCTV'      },
    { key: 'has_lift',      icon: 'fa-elevator',       label: 'Lift'      },
    { key: 'has_fridge',    icon: 'fa-temperature-low',label: 'Fridge'    },
  ].filter(a => listing[a.key])

  return (
    <div className="min-h-screen bg-white pt-16">

      {/* ── Photo Section ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-0">
        <Link to="/listings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to listings
        </Link>

        {/* Airbnb-style photo grid */}
        {photos.length > 0 ? (
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 480 }}>
            {photos.length === 1 ? (
              <img src={`${BASE}/${photos[0]}`} alt={listing.title}
                className="w-full h-full object-cover" />
            ) : (
              <div className="grid h-full gap-2"
                style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                {/* Big left photo */}
                <img src={`${BASE}/${photos[0]}`} alt={listing.title}
                  onClick={() => { setActivePhoto(0); setShowAllPhotos(true) }}
                  className="row-span-2 w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" />
                {/* Two right thumbnails */}
                {photos.slice(1, 3).map((p, i) => (
                  <img key={i} src={`${BASE}/${p}`} alt=""
                    onClick={() => { setActivePhoto(i + 1); setShowAllPhotos(true) }}
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" />
                ))}
              </div>
            )}
            {/* Show all photos button */}
            {photos.length > 3 && (
              <button onClick={() => setShowAllPhotos(true)}
                className="absolute bottom-4 right-4 bg-white text-slate-800 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all">
                <i className="fa-regular fa-images"></i> Show all {photos.length} photos
              </button>
            )}
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-slate-100 flex items-center justify-center" style={{ height: 480 }}>
            <i className="fa-solid fa-building text-6xl text-slate-300"></i>
          </div>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────── */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-white text-sm font-medium">{activePhoto + 1} / {photos.length}</span>
            <button onClick={() => setShowAllPhotos(false)}
              className="text-white hover:text-slate-300 text-xl transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 relative">
            <button onClick={() => setActivePhoto(p => (p - 1 + photos.length) % photos.length)}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <img src={`${BASE}/${photos[activePhoto]}`} alt=""
              className="max-h-[80vh] max-w-full object-contain rounded-lg" />
            <button onClick={() => setActivePhoto(p => (p + 1) % photos.length)}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          {/* Thumbnail strip */}
          <div className="flex gap-2 px-6 py-4 overflow-x-auto">
            {photos.map((p, i) => (
              <img key={i} src={`${BASE}/${p}`} alt=""
                onClick={() => setActivePhoto(i)}
                className={`h-14 w-20 object-cover rounded-lg cursor-pointer shrink-0 transition-all ${i === activePhoto ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-80'}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* ── Left ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Admin-verified fraud warnings */}
{verifiedReports.length > 0 && (
  <div className="mb-6 space-y-4">
    {verifiedReports.map(report => (
      <div
        key={report.id}
        className="border border-red-300 bg-red-50 rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-triangle-exclamation text-red-600"></i>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="font-bold text-red-800">
                Verified Fraud Report
              </h2>

              <span className="text-xs font-bold bg-red-600 text-white px-2.5 py-1 rounded-full">
                VERIFIED SCAM
              </span>
            </div>

            <p className="text-sm text-red-900 font-medium capitalize mb-2">
              {report.category.replaceAll('_', ' ')}
            </p>

            <p className="text-sm text-slate-700 whitespace-pre-line">
              {report.description}
            </p>

            {Number(report.visit_confirmed) === 1 && (
              <p className="text-xs font-medium text-slate-600 mt-3">
                <i className="fa-solid fa-location-dot mr-1"></i>
                Reporter confirmed visiting this property.
              </p>
            )}

            {report.admin_note && (
              <div className="mt-4 bg-white border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  Admin verification
                </p>
                <p className="text-sm text-slate-700">
                  {report.admin_note}
                </p>
              </div>
            )}

            {report.evidence?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Verified evidence
                </p>

                <div className="flex flex-wrap gap-2">
                  {report.evidence.map(item => (
                    <a
                      key={item.id}
                      href={`http://localhost:8000${item.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-medium border border-red-200 bg-white text-red-700 px-3 py-2 rounded-lg hover:bg-red-50"
                    >
                      <i
                        className={
                          item.evidence_type === 'video'
                            ? 'fa-solid fa-circle-play'
                            : 'fa-solid fa-image'
                        }
                      ></i>

                      {item.evidence_type === 'video'
                        ? 'View Video Proof'
                        : 'View Photo Proof'}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>
                Automated risk: {report.risk_level} ({report.risk_score}/100)
              </span>

              {report.reviewed_at && (
                <span>
                  Admin verified:{' '}
                  {new Date(report.reviewed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
)}


            {/* Title row */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mb-2">
                  {listing.title}
                </h1>
                <p className="text-slate-500 flex items-center gap-1.5">
                  <i className="fa-solid fa-location-dot text-blue-500 text-sm"></i>
                  {[listing.location, listing.area, listing.district].filter(Boolean).join(', ')}
                </p>
              </div>
<div className="flex items-center gap-2 shrink-0">
  <button
    type="button"
    onClick={handleShare}
    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
  >
    <i className="fa-solid fa-share-nodes"></i>
    Share
  </button>

  <button
    type="button"
    onClick={handleCopyLink}
    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
  >
    <i className="fa-solid fa-link"></i>
    {linkCopied ? 'Copied!' : 'Copy Link'}
  </button>
</div>
              <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-white"
                style={{ background: genderColor }}>
                {genderLabel}
              </span>
            </div>

            {/* Quick stats — Airbnb-style */}
            <div className="flex flex-wrap gap-6 py-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bed text-slate-400"></i>
                <span className="text-slate-700 font-medium">{listing.beds} Bedroom{listing.beds > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className={`fa-solid fa-couch text-slate-400`}></i>
                <span className="text-slate-700 font-medium">{listing.furnished ? 'Furnished' : 'Unfurnished'}</span>
              </div>
              {listing.utilities_included && (
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bolt text-slate-400"></i>
                  <span className="text-slate-700 font-medium">Bills Included</span>
                </div>
              )}
              {listing.lease_duration && (
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-file-contract text-slate-400"></i>
                  <span className="text-slate-700 font-medium">{listing.lease_duration} lease</span>
                </div>
              )}
              {listing.distance_to_campus && (
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-school text-slate-400"></i>
                  <span className="text-slate-700 font-medium">{listing.distance_to_campus} km to campus</span>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="py-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">About this place</h2>
                <p className="text-slate-600 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="py-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">What this place offers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenities.map(a => (
                    <div key={a.key} className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-xl">
                      <i className={`fa-solid ${a.icon} text-blue-600 w-5 text-center`}></i>
                      <span className="text-slate-700 text-sm font-medium">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property rules */}
            <div className="py-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">House rules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: 'fa-user-group', label: 'Guests', value: listing.guests_allowed ? 'Allowed' : 'Not allowed' },
                  { icon: 'fa-smoking',    label: 'Smoking', value: listing.smoking_allowed ? 'Allowed' : 'Not allowed' },
                  { icon: 'fa-clock',      label: 'Curfew',  value: listing.curfew_time || 'None' },
                  { icon: 'fa-money-bill', label: 'Advance', value: listing.advance_deposit ? listing.advance_deposit : '—' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <i className={`fa-solid ${rule.icon} text-slate-400 w-5 text-center`}></i>
                    <div>
                      <p className="text-xs text-slate-400">{rule.label}</p>
                      <p className="text-sm font-medium text-slate-700">{rule.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Tour */}
            {listing.video && (
              <div className="py-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Video Tour</h2>
                <video controls className="w-full rounded-2xl bg-black" style={{ maxHeight: 360 }}>
                  <source src={`${BASE}/${listing.video}`} type="video/mp4" />
                  <source src={`${BASE}/${listing.video}`} type="video/webm" />
                </video>
              </div>
            )}

            {/* Floor Plan */}
            {listing.floor_plan && (
              <div className="py-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Floor Plan</h2>
                <img src={`${BASE}/${listing.floor_plan}`} alt="Floor plan"
                  className="w-full rounded-2xl border border-slate-100"
                  onError={e => { e.target.style.display = 'none' }} />
              </div>
            )}
          </div>

          {/* ── Right — Sticky Booking Card ───────────────── */}
          <div className="lg:w-[360px] shrink-0">
            <div className="sticky top-24 space-y-4">
              <div className="border border-slate-200 rounded-2xl shadow-lg overflow-hidden bg-white">

                {/* Single vs Group Inquire / Booking Switcher */}
                {userGroup && (
                  <div className="p-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Inquire & Book As:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMode('group')
                          sessionStorage.setItem('ff_search_mode', 'group')
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          bookingMode === 'group'
                            ? 'bg-blue-700 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <i className="fa-solid fa-users text-[10px]"></i>
                        <span>As Group ({userGroup.members?.length || 2})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMode('single')
                          sessionStorage.setItem('ff_search_mode', 'single')
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          bookingMode === 'single'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <i className="fa-solid fa-user text-[10px]"></i>
                        <span>Single Student</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Price header */}
                <div className="p-6 border-b border-slate-100">
                  {bookingMode === 'group' && userGroup && userGroup.members?.length > 1 ? (
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-3xl font-black text-blue-700">
                          ৳{Math.round(listing.rent / userGroup.members.length).toLocaleString()}
                        </span>
                        <span className="text-slate-500 font-semibold text-xs">/ person per month</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Total rent: <strong className="text-slate-800">৳{Number(listing.rent).toLocaleString()}/mo</strong> split across {userGroup.members.length} roommates
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-600">Roommates:</span>
                        {userGroup.members.map((m) => (
                          <span key={m.id} className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md">
                            {m.full_name?.split(' ')[0] || 'Member'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-black text-slate-900">
                          ৳{Number(listing.rent).toLocaleString()}
                        </span>
                        <span className="text-slate-400 font-normal">/ month</span>
                      </div>
                      {userGroup && (
                        <p className="text-xs text-indigo-600 font-medium">
                          Individual student rate
                        </p>
                      )}
                    </div>
                  )}

                  {listing.available_from && (
                    <p className="text-sm text-slate-500 mt-2">
                      Available from{' '}
                      <span className="font-semibold text-slate-800">
                        {new Date(listing.available_from).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </p>
                  )}
                </div>

                {/* Contact info */}
                <div className="px-6 py-5 space-y-4">
                  {listing.landlord_name && (
                    <div className="flex items-center gap-3">
                      {listing.landlord_id ? (
                        <Link to={`/landlord/${listing.landlord_id}`} className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center shrink-0 transition-colors">
                          <i className="fa-solid fa-user text-blue-600 text-sm"></i>
                        </Link>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-user text-blue-600 text-sm"></i>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-400">Hosted by</p>
                        {listing.landlord_id ? (
                          <Link to={`/landlord/${listing.landlord_id}`} className="text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline group flex items-center gap-1.5">
                            {listing.landlord_name}
                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">{listing.landlord_name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {listing.landlord_id && (
                    <Link
                      to={`/messages/new?to=${listing.landlord_id}&msg=${encodeURIComponent(
                        bookingMode === 'group' && userGroup
                          ? `Hi ${listing.landlord_name || 'Landlord'}, I am inquiring on behalf of our roommate group "${userGroup.name}" (${userGroup.members?.length || 2} students). We are interested in viewing/booking your listing "${listing.title}" located at ${listing.location}.`
                          : `Hi ${listing.landlord_name || 'Landlord'}, I am interested in viewing/booking your listing "${listing.title}" located at ${listing.location}.`
                      )}`}
                      className={`flex items-center justify-center gap-2 w-full font-bold py-3.5 rounded-xl transition-all shadow-sm ${
                        bookingMode === 'group' && userGroup
                          ? 'bg-blue-700 hover:bg-blue-800 text-white'
                          : 'border border-blue-200 text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      <i className="fa-regular fa-message text-lg"></i>
                      <span>
                        {bookingMode === 'group' && userGroup
                          ? `Inquire / Book with Group (${userGroup.members?.length || 2})`
                          : 'Message Landlord'}
                      </span>
                    </Link>
                  )}

                  {/* ── Apply for this Listing (students only) ── */}
                  {currentUser?.role === 'student' && listing.status !== 'inactive' && (
                    <div className="pt-1">
                      {appLoading ? (
                        <div className="w-full py-3.5 text-center text-sm text-slate-400">
                          <i className="fa-solid fa-circle-notch fa-spin mr-2" />Checking application...
                        </div>
                      ) : application ? (
                        <div className={`w-full flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold border ${
                          application.status === 'pending'  ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          application.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          <div className="flex items-center gap-2">
                            <i className={`fa-solid ${
                              application.status === 'pending'  ? 'fa-clock' :
                              application.status === 'approved' ? 'fa-circle-check' : 'fa-circle-xmark'
                            }`} />
                            {application.status === 'pending'  ? 'Application Pending…' :
                             application.status === 'approved' ? 'Application Approved!' :
                             'Application Declined'}
                          </div>
                          {application.status === 'declined' && application.decline_reason && (
                            <div className="text-xs font-normal text-slate-500 max-w-[80%] text-center mt-1">
                              <strong>Reason:</strong> {application.decline_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowApplyModal(true)}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm"
                        >
                          <i className="fa-solid fa-file-signature" />
                          Apply for This Listing
                        </button>
                      )}
                    </div>
                  )}

                  {currentUser?.role === 'student' && listing.status === 'inactive' && (
                    <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-slate-100 border border-slate-200 text-slate-500">
                      <i className="fa-solid fa-ban" /> Unit No Longer Available
                    </div>
                  )}
                </div>
              </div>
              {/* Student fraud reporting */}
<div className="mt-4 mb-5 pt-4 border-t border-slate-100">
  <button
    type="button"
    onClick={() => setShowFraudReportForm(prev => !prev)}
    className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors"
  >
    <i className="fa-solid fa-flag"></i>
    {showFraudReportForm
      ? 'Close Report Form'
      : 'Report Listing / Landlord'}
  </button>

  {showFraudReportForm && (
    <div className="mt-4">
      <FraudReportForm
        listingId={listing.id}
        onSubmitted={() => setShowFraudReportForm(false)}
      />
    </div>
  )}
</div>



              {/* Property Details card */}
              <div className="border border-slate-200 rounded-2xl p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Property details</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Type',      value: listing.property_type ? listing.property_type.replace('_', ' ') : 'Entire Flat' },
                    { label: 'Bedrooms',  value: listing.beds },
                    { label: 'Furnished', value: listing.furnished ? 'Yes' : 'No' },
                    { label: 'Utilities', value: listing.utilities_included ? 'Included' : 'Not included' },
                    ...(listing.lease_duration ? [{ label: 'Lease', value: listing.lease_duration }] : []),
                    { label: 'For',       value: listing.gender_preference === 'any' ? 'All genders' : listing.gender_preference === 'female' ? 'Girls only' : 'Boys only' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-medium text-slate-800 capitalize">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compare with another listing */}
              <Link
                to={`/compare?a=${listing.id}`}
                className="flex items-center gap-2 justify-center w-full border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                <i className="fa-solid fa-scale-balanced"></i> Compare This Listing
              </Link>

              {/* 360 walkthrough */}
              {listing.walkthrough_link && (
                <a href={listing.walkthrough_link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 justify-center w-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-3 rounded-xl text-sm transition-colors">
                  <i className="fa-solid fa-vr-cardboard"></i> View 360° Walkthrough
                </a>
              )}

              {listing.landlord_id && (
                <Link
                  to={`/landlord/${listing.landlord_id}`}
                  className="block w-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-700 text-sm font-semibold text-center py-2.5 rounded-lg transition-colors mt-2"
                >
                  View Landlord Profile
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
      {/* Reviews & Ratings */}
<ReviewSection
  targetType={
    listing.property_type === 'single_room' ||
    listing.property_type === 'shared_room'
      ? 'room'
      : 'property'
  }
  targetId={id}
  reviewerId={currentUser?.id}
/>

      {/* ── Apply Modal ── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Apply for This Listing</h2>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
              <strong>{listing.title}</strong>
              <p className="text-xs text-blue-600 mt-0.5">{listing.location}</p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Preferred Move-In Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={applyMoveIn} min={new Date().toISOString().split('T')[0]}
                  onChange={e => setApplyMoveIn(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Expected Lease Duration</label>
                <select value={expectedDuration} onChange={e => setExpectedDuration(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="6 months">6 Months</option>
                  <option value="1 year">1 Year</option>
                  <option value="More than 1 year">More than 1 Year</option>
                  <option value="Less than 6 months">Less than 6 Months</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Who is paying rent?</label>
                <select value={rentPayer} onChange={e => setRentPayer(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="self">Self</option>
                  <option value="parents">Parents</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Guarantor Name <span className="text-red-500">*</span></label>
                  <input type="text" value={guarantorName} onChange={e => setGuarantorName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Guarantor Phone <span className="text-red-500">*</span></label>
                  <input type="tel" value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Relationship to Guarantor</label>
                  <input type="text" value={guarantorRelation} onChange={e => setGuarantorRel(e.target.value)} placeholder="e.g. Father, Mother, Uncle"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Emergency Contact <span className="text-red-500">*</span></label>
                  <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Name"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Emergency Phone <span className="text-red-500">*</span></label>
                  <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Phone"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Upload ID/NID <span className="text-slate-400 font-normal">(optional if verified)</span></label>
                <input type="file" accept="image/*,.pdf" onChange={e => setIdDoc(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Message to Landlord <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea value={applyNotes} onChange={e => setApplyNotes(e.target.value)}
                  placeholder="Introduce yourself — your university, year, lifestyle, etc." rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreeRules} onChange={e => setAgreeRules(e.target.checked)} className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                  <span className="text-sm text-slate-600">I agree to abide by the house rules and confirm all provided information is accurate. <span className="text-red-500">*</span></span>
                </label>
              </div>
            </div>

            {applyToast && (
              <div className={`text-sm px-4 py-3 rounded-xl ${applyToast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {applyToast.msg}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowApplyModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={submitApply}
                disabled={applySubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60 transition-colors"
              >
                {applySubmitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" />Sending…</> : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast (outside modal) ── */}
      {applyToast && !showApplyModal && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg text-sm font-semibold max-w-sm ${
          applyToast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          <i className={`fa-solid ${applyToast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'} mr-2`} />
          {applyToast.msg}
        </div>
      )}
    </div>
  )
}

export default ListingDetail