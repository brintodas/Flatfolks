import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function LandlordSignup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    nid: '', current_address: '', num_properties: '',
    password: '', confirm_password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match.')
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'landlord' })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('ff_user', JSON.stringify(data.user))
        setSuccess(data.message)
        setTimeout(() => navigate('/post-listing'), 2000)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Could not connect to server.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto">

        <div className="mb-8">
          <Link to="/get-started" className="text-sm text-slate-400 hover:text-slate-600">← Back</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-3 mb-1">Landlord Sign Up</h1>
          <p className="text-slate-500 text-sm">Create your account to start posting property listings.</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
            <i className="fa-solid fa-circle-check mr-2"></i>{success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-6 text-sm">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">

          {/* Personal Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="full_name" required value={form.full_name} onChange={handleChange}
                  placeholder="e.g. Mohammad Karim"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <input type="tel" name="phone" required value={form.phone} onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" name="email" required value={form.email} onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NID Number <span className="text-red-500">*</span></label>
                <input type="text" name="nid" required value={form.nid} onChange={handleChange}
                  placeholder="National ID number"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Property Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Property Details</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Address <span className="text-red-500">*</span></label>
                <input type="text" name="current_address" required value={form.current_address} onChange={handleChange}
                  placeholder="House, Road, Area, District"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Properties Owned</label>
                <input type="number" name="num_properties" min="0" value={form.num_properties} onChange={handleChange}
                  placeholder="e.g. 2"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Verification note */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
            <i className="fa-solid fa-shield-halved text-slate-400 mr-2"></i>
            After signing up, you can upload your <span className="font-medium">ownership documents</span> to get a <span className="font-medium text-blue-700">Verified Landlord Badge</span> on your listings.
          </div>

          {/* Password */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Set Password</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input type="password" name="password" required value={form.password} onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                <input type="password" name="confirm_password" required value={form.confirm_password} onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Landlord Account'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Already have an account? <Link to="/signin" className="text-blue-600 hover:underline">Sign in</Link>
          </p>

        </form>
      </div>
    </div>
  )
}

export default LandlordSignup
