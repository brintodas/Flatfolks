import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ADMIN_KEY = 'flatfolks-admin-2024'

function AdminDashboard() {
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  // Redirect if not admin
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-shield-halved text-red-500 text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-6">You must be signed in as an admin to view this page.</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'users') {
      fetch('http://localhost:8000/api/admin/users', { headers })
        .then(r => r.json())
        .then(json => { if (json.success) setUsers(json.data); setLoading(false) })
        .catch(() => setLoading(false))
    } else {
      fetch('http://localhost:8000/api/admin/listings', { headers })
        .then(r => r.json())
        .then(json => { if (json.success) setListings(json.data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [activeTab])

  const toggleVerifyUser = (id) => {
    fetch(`http://localhost:8000/api/admin/verify-user/${id}`, { method: 'PUT', headers })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: json.is_verified, has_badge: json.is_verified } : u))
        }
      })
  }

  const toggleVerifyListing = (id) => {
    fetch(`http://localhost:8000/api/admin/verify-listing/${id}`, { method: 'PUT', headers })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setListings(prev => prev.map(l => l.id === id ? { ...l, is_verified: json.is_verified } : l))
        }
      })
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredListings = listings.filter(l =>
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.location?.toLowerCase().includes(search.toLowerCase()) ||
    l.landlord_name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalUsers = users.length
  const verifiedUsers = users.filter(u => u.is_verified).length
  const totalListings = listings.length
  const verifiedListings = listings.filter(l => l.is_verified).length

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-xs text-slate-500">Flatfolks Control Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Signed in as <span className="text-slate-800 font-semibold">{currentUser.full_name}</span>
            </span>
            <button
              onClick={() => { localStorage.removeItem('ff_user'); navigate('/') }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: totalUsers, icon: 'fa-users' },
            { label: 'Verified Users', value: verifiedUsers, icon: 'fa-circle-check' },
            { label: 'Total Listings', value: totalListings, icon: 'fa-building' },
            { label: 'Verified Listings', value: verifiedListings, icon: 'fa-badge-check' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg p-5 border border-slate-200">
              <div className="text-slate-400 text-lg mb-2">
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div className="text-2xl font-bold text-slate-800 mb-1">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => { setActiveTab('users'); setSearch('') }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200'
            }`}
          >
            <i className="fa-solid fa-users mr-2"></i>Users
          </button>
          <button
            onClick={() => { setActiveTab('listings'); setSearch('') }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'listings'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200'
            }`}
          >
            <i className="fa-solid fa-building mr-2"></i>Listings
          </button>

          {/* Search */}
          <div className="ml-auto relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder={activeTab === 'users' ? 'Search users...' : 'Search listings...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 w-64"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400 text-sm">Loading data...</div>
            </div>
          ) : activeTab === 'users' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No users found.</td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          user.role === 'landlord' ? 'bg-slate-600' : 'bg-blue-600'
                        }`}>
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {user.full_name}
                            {user.is_verified === 1 && (
                              <i className="fa-solid fa-circle-check text-blue-500 text-xs" title="Verified"></i>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{user.phone || 'No phone'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        user.role === 'landlord'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <i className="fa-solid fa-circle-check"></i> Verified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not verified</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleVerifyUser(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                          user.is_verified
                            ? 'bg-white text-red-600 hover:bg-red-50 border-red-200'
                            : 'bg-white text-green-700 hover:bg-green-50 border-green-200'
                        }`}
                      >
                        {user.is_verified ? 'Revoke Badge' : 'Give Badge'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Landlord</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredListings.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No listings found.</td></tr>
                ) : filteredListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {listing.title}
                        {listing.is_verified === 1 && (
                          <i className="fa-solid fa-circle-check text-blue-500 text-xs" title="Verified Property"></i>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{listing.location}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{listing.landlord_name || '—'}</td>
                    <td className="px-5 py-4 text-slate-800 font-semibold">৳{Number(listing.rent).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        listing.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {listing.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <i className="fa-solid fa-circle-check"></i> Verified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not verified</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleVerifyListing(listing.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                          listing.is_verified
                            ? 'bg-white text-red-600 hover:bg-red-50 border-red-200'
                            : 'bg-white text-green-700 hover:bg-green-50 border-green-200'
                        }`}
                      >
                        {listing.is_verified ? 'Revoke' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
