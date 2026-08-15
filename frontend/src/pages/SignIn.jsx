import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function SignIn() {
  const navigate = useNavigate()
  const [role, setRole] = useState('student')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('ff_user', JSON.stringify(data.user))
        navigate(data.user.role === 'admin' ? '/admin' : role === 'landlord' ? '/post-listing' : '/listings')
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
      <div className="max-w-md mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Sign In</h1>
          <p className="text-slate-500 text-sm">Welcome back to Flatfolks.</p>
        </div>

        {/* Role tabs */}
        <div className="flex border border-slate-200 rounded-lg overflow-hidden mb-6 bg-white">
          <button
            onClick={() => { setRole('student'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              role === 'student' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-graduation-cap mr-2"></i>Student
          </button>
          <button
            onClick={() => { setRole('landlord'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              role === 'landlord' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-building mr-2"></i>Landlord
          </button>
          <button
            onClick={() => { setRole('admin'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              role === 'admin' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-shield-halved mr-2"></i>Admin
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-5 text-sm">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" name="email" required value={form.email} onChange={handleChange}
              placeholder={role === 'student' ? 'you@g.bracu.ac.bd' : 'your@email.com'}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <a href="#" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
            </div>
            <input type="password" name="password" required value={form.password} onChange={handleChange}
              placeholder="Your password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'Signing in...' : `Sign In as ${role === 'student' ? 'Student' : role === 'admin' ? 'Admin' : 'Landlord'}`}
          </button>

          <p className="text-xs text-slate-400 text-center pt-1">
            Don't have an account?{' '}
            <Link to="/get-started" className="text-blue-600 hover:underline font-medium">Get Started</Link>
          </p>

        </form>

      </div>
    </div>
  )
}

export default SignIn
