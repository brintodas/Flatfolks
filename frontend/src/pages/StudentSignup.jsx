import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const departments = [
  'CSE', 'EEE', 'BBA', 'ECE', 'Architecture',
  'English', 'Economics', 'Law', 'MNS', 'Pharmacy',
  'Public Health', 'Social Sciences'
]

const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']

function StudentSignup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', student_id: '', email: '', phone: '',
    department: '', semester: '', gender: '',
    budget_min: '', budget_max: '',
    preferred_district: '', preferred_area: '',
    password: '', confirm_password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleChange = e => {
    const { name, value } = e.target
    if (name === 'preferred_district') {
      setForm(prev => ({ ...prev, preferred_district: value, preferred_area: '' }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match.')
    }
    if (!form.email.endsWith('@g.bracu.ac.bd') && !form.email.endsWith('@bracu.ac.bd')) {
      return setError('Please use your BRACU university email (@g.bracu.ac.bd).')
    }
    if (form.budget_min && form.budget_max && parseInt(form.budget_min) > parseInt(form.budget_max)) {
      return setError('Minimum budget cannot be more than maximum.')
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'student' })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('ff_user', JSON.stringify(data.user))
        setSuccess(data.message)
        setTimeout(() => navigate('/listings'), 2000)
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
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <Link to="/get-started" className="text-sm text-slate-400 hover:text-slate-600">← Back</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-3 mb-1">Student Sign Up</h1>
          <p className="text-slate-500 text-sm">Use your BRACU email to unlock a verified student badge.</p>
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

          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Basic Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="full_name" required value={form.full_name} onChange={handleChange}
                  placeholder="e.g. Rahul Ahmed"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student ID <span className="text-red-500">*</span></label>
                <input type="text" name="student_id" required value={form.student_id} onChange={handleChange}
                  placeholder="e.g. 21301234"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">University Email <span className="text-red-500">*</span></label>
                <input type="email" name="email" required value={form.email} onChange={handleChange}
                  placeholder="you@g.bracu.ac.bd"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Academic Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Academic Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                <select name="department" required value={form.department} onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">Select</option>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Semester <span className="text-red-500">*</span></label>
                <select name="semester" required value={form.semester} onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">Select</option>
                  {semesters.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Housing Preferences */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Housing Preferences</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range (৳/month)</label>
                <div className="flex items-center gap-2">
                  <input type="number" name="budget_min" value={form.budget_min} onChange={handleChange}
                    placeholder="Min"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                  <span className="text-slate-400 shrink-0">–</span>
                  <input type="number" name="budget_max" value={form.budget_max} onChange={handleChange}
                    placeholder="Max"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred District</label>
                <select name="preferred_district" value={form.preferred_district} onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">Any</option>
                  <option>Dhaka</option>
                  <option>Gazipur</option>
                  <option>Narayanganj</option>
                  <option>Chittagong</option>
                  <option>Sylhet</option>
                </select>
              </div>
              {form.preferred_district === 'Dhaka' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Area</label>
                  <select name="preferred_area" value={form.preferred_area} onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                    <option value="">Any</option>
                    <option>Dhanmondi</option><option>Banani</option><option>Gulshan</option>
                    <option>Bashundhara R/A</option><option>Mirpur</option><option>Mohakhali</option>
                    <option>Uttara</option><option>Mohammadpur</option><option>Badda</option>
                    <option>Farmgate</option><option>Rampura</option><option>Khilgaon</option>
                    <option>Baridhara</option><option>Tejgaon</option><option>Shyamoli</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

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
            {loading ? 'Creating account...' : 'Create Student Account'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Already have an account? <Link to="/signin" className="text-blue-600 hover:underline">Sign in</Link>
          </p>

        </form>
      </div>
    </div>
  )
}

export default StudentSignup
