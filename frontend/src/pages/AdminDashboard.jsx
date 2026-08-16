import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FraudReportsAdmin from '../components/FraudReportsAdmin'

const ADMIN_KEY = 'flatfolks-admin-2024'

function AdminDashboard() {
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  // Redirect if not admin
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-shield-halved text-red-400 text-4xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You must be signed in as an admin to view this page.</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
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
    Promise.all([
      fetch('http://localhost:8000/api/admin/users', { headers }).then(r => r.json()),
      fetch('http://localhost:8000/api/admin/listings', { headers }).then(r => r.json())
    ])
      .then(([usersJson, listingsJson]) => {
        if (usersJson.success) setUsers(usersJson.data)
        if (listingsJson.success) setListings(listingsJson.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-shield-halved text-white"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">Flatfolks Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              <i className="fa-solid fa-circle text-green-400 text-xs mr-1"></i>
              Signed in as <span className="text-white font-semibold">{currentUser.full_name}</span>
            </span>
            <button
              onClick={() => { localStorage.removeItem('ff_user'); navigate('/') }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors"
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
            { label: 'Total Users', value: totalUsers, icon: 'fa-users', color: 'blue' },
            { label: 'Verified Users', value: verifiedUsers, icon: 'fa-circle-check', color: 'green' },
            { label: 'Total Listings', value: totalListings, icon: 'fa-building', color: 'purple' },
            { label: 'Verified Listings', value: verifiedListings, icon: 'fa-badge-check', color: 'amber' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className={`text-${stat.color}-400 text-xl mb-2`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('users'); setSearch('') }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <i className="fa-solid fa-users mr-2"></i>Users
          </button>
          <button
            onClick={() => { setActiveTab('listings'); setSearch('') }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'listings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <i className="fa-solid fa-building mr-2"></i>Listings
          </button>
           <button
  onClick={() => {
    setActiveTab('fraud')
    setSearch('')
  }}
  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
    activeTab === 'fraud'
      ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
  }`}
>
  <i className="fa-solid fa-shield-halved mr-2"></i>
  Fraud Reports
</button>
          {/* Search */}
          <div className="ml-auto relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder={activeTab === 'users' ? 'Search users...' : 'Search listings...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 w-64"
            />
          </div>
        </div>

        {/* Table */}
        {activeTab === 'fraud' ? (
           <FraudReportsAdmin />
        ) : (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400 text-sm animate-pulse">Loading data...</div>
            </div>
          ) : activeTab === 'users' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500">No users found.</td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                          user.role === 'landlord' ? 'bg-purple-600' : 'bg-blue-600'
                        }`}>
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {user.full_name}
                            {user.is_verified === 1 && (
                              <i className="fa-solid fa-circle-check text-blue-400 text-xs" title="Verified"></i>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{user.phone || 'No phone'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'landlord'
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'bg-blue-500/15 text-blue-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{user.email}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs font-semibold">
                          <i className="fa-solid fa-circle-check"></i> Verified
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Not verified</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleVerifyUser(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          user.is_verified
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
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
                <tr className="border-b border-slate-700 bg-slate-700/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Property</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Landlord</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredListings.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500">No listings found.</td></tr>
                ) : filteredListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {listing.title}
                        {listing.is_verified === 1 && (
                          <i className="fa-solid fa-circle-check text-blue-400 text-xs" title="Verified Property"></i>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{listing.location}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{listing.landlord_name || '—'}</td>
                    <td className="px-5 py-4 text-white font-semibold">৳{Number(listing.rent).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        listing.status === 'active'
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {listing.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs font-semibold">
                          <i className="fa-solid fa-circle-check"></i> Verified
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Not verified</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleVerifyListing(listing.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          listing.is_verified
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
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
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
