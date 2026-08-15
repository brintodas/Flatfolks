import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const QUIZ_META = {
  sleep_schedule:  { label: 'Sleep Schedule', icon: 'fa-moon',        options: ['Early bird', 'Flexible', 'Night owl'] },
  cleanliness:     { label: 'Cleanliness',    icon: 'fa-broom',       options: ['Messy', 'Average', 'Neat freak'] },
  noise_tolerance: { label: 'Noise',          icon: 'fa-volume-high', options: ['Quiet only', 'Moderate', 'Loud is fine'] },
  guests_pref:     { label: 'Guests',         icon: 'fa-user-group',  options: ['Never', 'Occasionally', 'Often'] },
  smoking_pref:    { label: 'Smoking',        icon: 'fa-ban-smoking',  options: ['Non-smoker', "Don't mind", 'Smoker'] },
  study_habits:    { label: 'Study Habits',   icon: 'fa-book-open',   options: ['At home', 'Mixed', 'Library'] },
}

const ROOM_LABELS = { single: 'Single Room', shared: 'Shared Room', either: 'Either' }
const MOVEIN_LABELS = {
  ASAP: 'ASAP',
  '1 month': 'Within 1 month',
  '3 months': 'Within 3 months',
  '6 months': 'Within 6 months',
}

function RoommatePublicProfile() {
  const { userId }    = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const isOwnProfile = currentUser && String(currentUser.id) === String(userId)

  useEffect(() => {
    // Fetch profile
    fetch(`http://localhost:8000/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true) }
        else { setProfile(data) }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading profile...</p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-regular fa-face-sad-tear text-slate-300 text-4xl mb-3"></i>
          <h2 className="text-lg font-bold text-slate-700 mb-1">Profile not found</h2>
          <p className="text-slate-500 text-sm">This student hasn't set up their profile yet.</p>
          <Link to="/roommates" className="mt-5 inline-block text-sm text-blue-700 hover:underline">← Back to matches</Link>
        </div>
      </div>
    )
  }

  const tags         = profile.personality_tags ? profile.personality_tags.split(',').filter(Boolean) : []
  const quizDone     = profile.quiz_completed === 1
  const photoSrc     = profile.profile_photo ? `http://localhost:8000${profile.profile_photo}` : null
  const initials     = profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const budgetLabel  = (profile.budget_min && profile.budget_max)
    ? `৳${Number(profile.budget_min).toLocaleString()} – ৳${Number(profile.budget_max).toLocaleString()}/mo`
    : profile.budget_max
      ? `Up to ৳${Number(profile.budget_max).toLocaleString()}/mo`
      : 'Not set'

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Top Card ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-5">


          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">

              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 border-4 border-white shadow-md flex items-center justify-center">
                  {photoSrc
                    ? <img src={photoSrc} alt={profile.full_name} className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-blue-700">{initials}</span>
                  }
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-800">{profile.full_name}</h1>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mb-4">
                  {profile.department && <span><i className="fa-solid fa-graduation-cap mr-1.5 text-slate-400"></i>{profile.department}</span>}
                  {profile.semester   && <span><i className="fa-solid fa-layer-group mr-1.5 text-slate-400"></i>{profile.semester} semester</span>}
                  {profile.gender     && <span><i className="fa-solid fa-person mr-1.5 text-slate-400"></i>{profile.gender}</span>}
                  {profile.course     && <span><i className="fa-solid fa-book mr-1.5 text-slate-400"></i>{profile.course}</span>}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {isOwnProfile ? (
                    <Link to="/roommate-profile"
                      className="px-4 py-2 text-sm font-semibold border border-blue-700 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                      Edit Profile
                    </Link>
                  ) : (
                    <>
                      <button className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">
                        Send Roommate Request
                      </button>
                      <Link to={`/messages/new?to=${userId}`} className="px-4 py-2 text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center">
                        <i className="fa-regular fa-message mr-1.5"></i>Message
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            {[
              { icon: 'fa-bangladeshi-taka-sign', label: 'Budget', value: budgetLabel },
              { icon: 'fa-location-dot',          label: 'Area',   value: profile.preferred_area ? `${profile.preferred_area}, ${profile.preferred_district}` : (profile.preferred_district || '—') },
              { icon: 'fa-calendar-check',        label: 'Move-in', value: MOVEIN_LABELS[profile.move_in_timeframe] || 'Not set' },
              { icon: 'fa-bed',                   label: 'Room',   value: ROOM_LABELS[profile.room_type] || 'Either' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="px-4 py-4 text-center">
                <i className={`fa-solid ${icon} text-blue-600 text-sm mb-1`}></i>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-700 leading-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="grid sm:grid-cols-5 gap-5">

          {/* Left column */}
          <div className="sm:col-span-3 space-y-5">

            {/* About */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">About</h2>
              {profile.bio
                ? <p className="text-slate-700 text-sm leading-relaxed">{profile.bio}</p>
                : <p className="text-slate-400 text-sm italic">No bio written yet.</p>
              }
            </div>

            {/* Lifestyle Scores */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Lifestyle & Habits</h2>

              {quizDone ? (
                <div className="space-y-3">
                  {Object.entries(QUIZ_META).map(([key, { label, icon, options }]) => {
                    const score = profile[key]
                    const text  = score ? options[score - 1] : '—'
                    const pct   = score ? (score / 3) * 100 : 0
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <i className={`fa-solid ${icon} w-3.5 text-center text-slate-400`}></i>
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">{text}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(QUIZ_META).map(([key, { label, icon }]) => (
                    <div key={key} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <i className={`fa-solid ${icon} text-slate-300 text-sm w-4 text-center`}></i>
                      <div>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-xs font-medium text-slate-300">—</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!quizDone && (
                <p className="text-xs text-slate-400 mt-3">
                  <i className="fa-regular fa-clock mr-1"></i>
                  Lifestyle quiz not completed yet.
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="sm:col-span-2 space-y-5">

            {/* Personality Tags */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Personality</h2>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">No tags added yet.</p>
              )}
            </div>

            {/* Looking For */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Looking For</h2>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-bed text-slate-400 mt-0.5 w-4 text-center text-xs"></i>
                  <span>{ROOM_LABELS[profile.room_type] || 'Any room type'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-location-dot text-slate-400 mt-0.5 w-4 text-center text-xs"></i>
                  <span>{profile.preferred_area
                    ? `${profile.preferred_area}, ${profile.preferred_district}`
                    : profile.preferred_district || 'Area not specified'
                  }</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-bangladeshi-taka-sign text-slate-400 mt-0.5 w-4 text-center text-xs"></i>
                  <span>{budgetLabel}</span>
                </li>
                {profile.move_in_timeframe && (
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-calendar text-slate-400 mt-0.5 w-4 text-center text-xs"></i>
                    <span>{MOVEIN_LABELS[profile.move_in_timeframe]}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Safety note */}
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">
                <i className="fa-solid fa-shield-halved mr-1.5"></i>
                Always meet in a public place first. Never share your personal phone number until you're comfortable.
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link to="/roommates" className="text-sm text-slate-500 hover:text-blue-700">
            ← Back to roommate matches
          </Link>
        </div>

      </div>
    </div>
  )
}

export default RoommatePublicProfile
