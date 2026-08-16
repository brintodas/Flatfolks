import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const STATUS_META = {
  none:     { label: 'Not submitted', color: 'bg-slate-100 text-slate-600', icon: 'fa-circle-minus' },
  pending:  { label: 'Under review',  color: 'bg-amber-50 text-amber-700',  icon: 'fa-clock' },
  approved: { label: 'Verified',      color: 'bg-green-50 text-green-700', icon: 'fa-circle-check' },
  rejected: { label: 'Rejected — please resubmit', color: 'bg-red-50 text-red-600', icon: 'fa-circle-xmark' },
}

function LandlordProfileSetup() {
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [form, setForm] = useState({
    full_name: '', business_name: '', business_type: 'individual',
    bio: '', phone: '', current_address: '', nid: ''
  })

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'landlord') { setLoading(false); return }

    fetch(`http://localhost:8000/api/landlord/${currentUser.id}/profile`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProfile(data.data)
          setForm({
            full_name: data.data.full_name || '',
            business_name: data.data.business_name || '',
            business_type: data.data.business_type || 'individual',
            bio: data.data.bio || '',
            phone: data.data.phone || '',
            current_address: data.data.current_address || '',
            nid: data.data.nid || ''
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentUser?.id])

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`http://localhost:8000/api/landlord/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) setMessage('Business account updated.')
      else setError(data.message)
    } catch {
      setError('Could not connect to server.')
    }
    setSaving(false)
  }

  const handleAvatarSelect = e => {
    const f = e.target.files[0] || null
    setAvatarFile(f)
    setAvatarPreview(f ? URL.createObjectURL(f) : null)
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return setError('Choose a photo first.')
    setAvatarUploading(true)
    setError('')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      const res = await fetch(`http://localhost:8000/api/landlord/${currentUser.id}/profile-picture`, {
        method: 'POST',
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Profile picture updated.')
        setProfile(prev => ({ ...prev, profile_picture: data.profile_picture }))
        setAvatarFile(null)
        setAvatarPreview(null)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Could not connect to server.')
    }
    setAvatarUploading(false)
  }

  const handleUpload = async () => {
    if (!file) return setError('Choose a file first.')
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('document', file)
      const res = await fetch(`http://localhost:8000/api/landlord/${currentUser.id}/verification-doc`, {
        method: 'POST',
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Document submitted! An admin will review it shortly.')
        setProfile(prev => ({ ...prev, verification_status: 'pending', verification_doc: data.verification_doc }))
        setFile(null)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Could not connect to server.')
    }
    setUploading(false)
  }

  if (!currentUser || currentUser.role !== 'landlord') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center px-4">
        <div className="text-center">
          <i className="fa-solid fa-building-shield text-slate-300 text-4xl mb-4"></i>
          <h2 className="text-lg font-bold text-slate-700 mb-2">Landlord account required</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in as a landlord to manage your business account.</p>
          <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <p className="text-slate-500">Loading your account...</p>
      </div>
    )
  }

  const status = STATUS_META[profile?.verification_status || 'none']

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Business Account</h1>
            <p className="text-slate-500 text-sm">Your legal contact info and verification status.</p>
          </div>
          <Link
            to={`/landlord/${currentUser.id}`}
            className="shrink-0 text-sm font-medium text-blue-700 hover:underline whitespace-nowrap"
          >
            View public profile →
          </Link>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
            <i className="fa-solid fa-circle-check mr-2"></i>{message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-6 text-sm">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
          </div>
        )}

        {/* Profile picture card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Profile Picture</p>
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : profile?.profile_picture ? (
                <img src={`http://localhost:8000${profile.profile_picture}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-700">
                  {(form.business_name || form.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleAvatarSelect}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-xs file:font-semibold"
              />
              <button
                onClick={handleAvatarUpload}
                disabled={avatarUploading || !avatarFile}
                className="shrink-0 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {avatarUploading ? 'Uploading...' : 'Save Photo'}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">This photo appears on your public profile and listings. JPG, PNG or WEBP, up to 4MB.</p>
        </div>

        {/* Verification status card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-700">Verification Status</p>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
              <i className={`fa-solid ${status.icon} mr-1.5`}></i>{status.label}
            </span>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Upload your national ID or property ownership deed. Once an admin approves it, a{' '}
            <span className="font-medium text-blue-700">Verified Landlord Badge</span> appears on your public profile and listings.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={e => setFile(e.target.files[0] || null)}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-xs file:font-semibold"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="shrink-0 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {uploading ? 'Uploading...' : 'Submit Document'}
            </button>
          </div>
        </div>

        {/* Business info form */}
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Business Information</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" name="full_name" value={form.full_name} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
              <select name="business_type" value={form.business_type} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                <option value="individual">Individual Owner</option>
                <option value="company">Company / Agency</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {form.business_type === 'company' ? 'Company Name' : 'Business / Display Name'}
              </label>
              <input type="text" name="business_name" value={form.business_name} onChange={handleChange}
                placeholder="e.g. Rahman Properties"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NID Number</label>
              <input type="text" name="nid" value={form.nid} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Address</label>
              <input type="text" name="current_address" value={form.current_address} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Public Bio</label>
              <textarea name="bio" rows="3" value={form.bio} onChange={handleChange}
                placeholder="A short note students see on your public profile..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <Link to="/post-listing" className="text-slate-500 hover:text-blue-700">← Back to Post Listing</Link>
          <button onClick={() => navigate(`/landlord/${currentUser.id}/dashboard`)} className="text-blue-700 font-semibold hover:underline">
            Go to Dashboard →
          </button>
        </div>
      </div>
    </div>
  )
}

export default LandlordProfileSetup