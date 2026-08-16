import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RoommateGroupPanel from '../components/RoommateGroupPanel'
import { universitiesInBD } from '../utils/universities'
import { commonMajorsInBD } from '../utils/majors'
import Autocomplete from '../components/Autocomplete'

const DISTRICTS = ['Dhaka', 'Gazipur', 'Narayanganj', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Comilla']

const AREAS_BY_DISTRICT = {
  Dhaka:        ['Dhanmondi','Banani','Gulshan','Bashundhara R/A','Mirpur','Mohakhali','Uttara','Mohammadpur','Aftabnagar','Badda','Moghbazar','Farmgate','Baridhara','Khilgaon','Rampura','Lalmatia','Shyamoli','Tejgaon','Kuril','Vatara'],
  Gazipur:      ['Tongi','Joydebpur','Gazipur Sadar','Kashimpur'],
  Narayanganj:  ['Narayanganj Sadar','Siddhirganj','Fatullah'],
  Chittagong:   ['Halishahar','GEC Circle','Agrabad','Nasirabad','Pahartali','Khulshi','Chawkbazar'],
  Sylhet:       ['Sylhet Sadar','Zindabazar','Amberkhana','Shahjalal Upashahar'],
  Rajshahi:     ['Rajshahi Sadar','Boalia','Motihar'],
  Khulna:       ['Khulna Sadar','Sonadanga','Khalishpur'],
  Comilla:      ['Comilla Sadar','Kotbari','Kandirpar'],
}

const PERSONALITY_TAGS = [
  'Introvert','Extrovert','Night Coder','Early Riser','Gym Rat',
  'Foodie','Gamer','Bookworm','Minimalist','Homebody',
  'Social','Clean Freak','Laid-back','Studious','Creative',
]

const QUIZ_LABELS = {
  sleep_schedule: { label: 'Sleep Schedule', options: ['Early bird', 'Flexible', 'Night owl'] },
  cleanliness:    { label: 'Cleanliness',    options: ['Messy', 'Average', 'Neat freak'] },
  noise_tolerance:{ label: 'Noise Tolerance',options: ['Quiet', 'Moderate', 'Loud is fine'] },
  guests_pref:    { label: 'Guests',         options: ['Never', 'Occasionally', 'Frequently'] },
  smoking_pref:   { label: 'Smoking',        options: ['Non-smoker', "Don't care", 'Smoker'] },
  study_habits:   { label: 'Study Habits',   options: ['Study at home', 'Mixed', 'Library'] },
}

function RoommateProfile() {
  const navigate  = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  // guard: must be a logged-in student
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-lock text-slate-300 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Sign in required</h2>
          <p className="text-slate-500 text-sm mb-6">You need to be signed in as a student to set up a roommate profile.</p>
          <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">
            Sign In
          </Link>
        </div>
      </div>
    )
  }
  if (currentUser.role !== 'student') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-triangle-exclamation text-amber-400 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Students only</h2>
          <p className="text-slate-500 text-sm mb-6">Roommate profiles are for student accounts only.</p>
          <Link to="/" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const [form, setForm] = useState({
    university: '',
    course: '',
    year_of_study: '',
    bio: '',
    budget_min: '',
    budget_max: '',
    preferred_district: '',
    preferred_area: '',
    move_in_timeframe: '',
    room_type: 'either',
  })
  const [selectedTags, setSelectedTags] = useState([])
  const [quizScores, setQuizScores]     = useState(null)
  const [quizDone, setQuizDone]         = useState(false)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [photoUrl, setPhotoUrl]         = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError]     = useState('')

  // load existing profile on mount
  useEffect(() => {
    fetch(`http://localhost:8000/api/profile/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setForm({
            university:         data.university         || '',
            course:             data.course             || '',
            year_of_study:      data.year_of_study      || '',
            bio:                data.bio                || '',
            budget_min:         data.budget_min         || '',
            budget_max:         data.budget_max         || '',
            preferred_district: data.preferred_district || '',
            preferred_area:     data.preferred_area     || '',
            move_in_timeframe:  data.move_in_timeframe  || '',
            room_type:          data.room_type          || 'either',
          })
          setSelectedTags(data.personality_tags ? data.personality_tags.split(',').filter(Boolean) : [])
          setQuizDone(data.quiz_completed === 1)
          if (data.profile_photo) setPhotoUrl(`http://localhost:8000${data.profile_photo}`)
          if (data.quiz_completed) {
            setQuizScores({
              sleep_schedule:  data.sleep_schedule,
              cleanliness:     data.cleanliness,
              noise_tolerance: data.noise_tolerance,
              guests_pref:     data.guests_pref,
              smoking_pref:    data.smoking_pref,
              study_habits:    data.study_habits,
            })
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoError('')
    setPhotoUploading(true)
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('user_id', currentUser.id)
    try {
      const res  = await fetch('http://localhost:8000/api/profile/upload-photo', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed')
      setPhotoUrl(`http://localhost:8000${data.photo_url}`)
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const toggleTag = tag => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else if (selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const res = await fetch('http://localhost:8000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:            currentUser.id,
          ...form,
          personality_tags:   selectedTags,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Profile saved!')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-20">
        <p className="text-slate-500 text-sm">Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">


        {/* ── Roommate Group Panel ─────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-people-group text-blue-600"></i>
            My Roommate Group
          </h2>
          <RoommateGroupPanel userId={currentUser.id} userName={currentUser.full_name} />
        </div>

        {/* ── Profile Edit Form ────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Profile Photo */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
              Profile Photo
            </h2>
            <div className="flex items-center gap-5">
              {/* Avatar preview */}
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                {photoUrl
                  ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  : <i className="fa-regular fa-user text-slate-300 text-3xl"></i>
                }
              </div>
              <div>
                <label className="cursor-pointer inline-block px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  {photoUploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2">JPG, PNG or WEBP — max 3MB</p>
                {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
              </div>
            </div>
          </div>

          {/* Section 1 — The Basics */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3">
              The Basics
            </h2>

            {/* Account Details — read-only from account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={currentUser.full_name || currentUser.name || ''}
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={currentUser.email || ''}
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={currentUser.phone || ''}
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                  placeholder="No phone number added"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1 md:col-span-2">Pulled from your account — edit in settings.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                University <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={universitiesInBD}
                name="university"
                value={form.university}
                onChange={handleChange}
                placeholder="Type to search your university..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Course / Major <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={commonMajorsInBD}
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  placeholder="e.g. CSE, EEE, BBA"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year of Study</label>
                <select
                  name="year_of_study"
                  value={form.year_of_study}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select year</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                  <option value="Masters">Masters</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">A little about me</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={3}
                placeholder="Tell potential roommates a bit about yourself..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Section 2 — Housing Preferences */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3">
              Housing Preferences
            </h2>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monthly Budget (৳)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="budget_min"
                  value={form.budget_min}
                  onChange={handleChange}
                  placeholder="Min (e.g. 5000)"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  name="budget_max"
                  value={form.budget_max}
                  onChange={handleChange}
                  placeholder="Max (e.g. 12000)"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred District</label>
                <select
                  name="preferred_district"
                  value={form.preferred_district}
                  onChange={e => setForm({ ...form, preferred_district: e.target.value, preferred_area: '' })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Area</label>
                <select
                  name="preferred_area"
                  value={form.preferred_area}
                  onChange={handleChange}
                  disabled={!form.preferred_district}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white disabled:opacity-50"
                >
                  <option value="">Select area</option>
                  {(AREAS_BY_DISTRICT[form.preferred_district] || []).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Move-in + Room type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Move-in Timeframe</label>
                <select
                  name="move_in_timeframe"
                  value={form.move_in_timeframe}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Not sure yet</option>
                  <option value="ASAP">As soon as possible</option>
                  <option value="1 month">Within 1 month</option>
                  <option value="3 months">Within 3 months</option>
                  <option value="6 months">Within 6 months</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
                <select
                  name="room_type"
                  value={form.room_type}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="either">Either</option>
                  <option value="single">Single room</option>
                  <option value="shared">Shared room</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3 — Personality Tags */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
              Personality Tags
              <span className="ml-2 text-xs font-normal text-slate-400">Pick up to 5</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                const maxed  = !active && selectedTags.length >= 5
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={maxed}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all
                      ${active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : maxed
                          ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                          : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-700'
                      }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-slate-400 mt-3">
                Selected: {selectedTags.join(', ')}
              </p>
            )}
          </div>

          {/* Section 4 — Lifestyle Quiz Scores (read-only, set by quiz system) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
              Lifestyle Quiz Scores
            </h2>

            {quizDone && quizScores ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(QUIZ_LABELS).map(([key, { label, options }]) => {
                  const score = quizScores[key]
                  const text  = score ? (options[score - 1] || '—') : '—'
                  return (
                    <div key={key} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="text-sm font-semibold text-blue-700">{text}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                <i className="fa-regular fa-clock text-slate-300 text-2xl mb-2"></i>
                <p className="text-sm text-slate-500">Quiz not completed yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Your scores will appear here once the lifestyle quiz is available.
                </p>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{success}</p>}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <Link to="/roommates" className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
              Browse Matches
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}

export default RoommateProfile
