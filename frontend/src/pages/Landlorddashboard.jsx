import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts'

const API = 'http://localhost:8000/api/landlord'

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

function QuickEditRow({ listing, landlordId, onUpdated, onOpenTenant }) {
  const [rent, setRent] = useState(listing.rent)
  const [status, setStatus] = useState(listing.status)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`${API}/listings/${listing.id}/quick-update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rent, status })
    })
    setSaving(false)
    onUpdated()
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-3 pr-4">
        <p className="text-sm font-semibold text-slate-800">{listing.title}</p>
        <p className="text-xs text-slate-400">{listing.property_group || 'Ungrouped'}</p>
      </td>
      <td className="py-3 pr-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${listing.occupied ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-700'}`}>
          {listing.occupied ? 'Occupied' : 'Vacant'}
        </span>
      </td>
      <td className="py-3 pr-4">
        <input type="number" value={rent} onChange={e => setRent(e.target.value)}
          className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
      </td>
      <td className="py-3 pr-4">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white">
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </td>
      <td className="py-3 text-right space-x-2 whitespace-nowrap">
        <button onClick={save} disabled={saving}
          className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        {!listing.occupied && (
          <button onClick={() => onOpenTenant(listing)} className="text-xs font-semibold text-green-700 hover:underline">
            + Add Tenant
          </button>
        )}
      </td>
    </tr>
  )
}

function AddTenantForm({ listing, landlordId, onClose, onSaved }) {
  const [form, setForm] = useState({ tenant_name: '', tenant_phone: '', rent_amount: listing.rent, start_date: '' })
  const [saving, setSaving] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`${API}/tenancies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listing.id, landlord_id: landlordId, ...form })
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) { onSaved(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-slate-800 mb-1">Add Tenant</h3>
        <p className="text-xs text-slate-400 mb-4">{listing.title}</p>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Tenant name" value={form.tenant_name}
            onChange={e => setForm(p => ({ ...p, tenant_name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input placeholder="Phone" value={form.tenant_phone}
            onChange={e => setForm(p => ({ ...p, tenant_phone: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input required type="number" placeholder="Monthly rent" value={form.rent_amount}
            onChange={e => setForm(p => ({ ...p, rent_amount: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input required type="date" value={form.start_date}
            onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 text-sm border border-slate-200 rounded-lg py-2 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 text-sm bg-blue-700 text-white rounded-lg py-2 hover:bg-blue-800 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LandlordDashboard() {
  const params = useParams()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const landlordId = params.id || currentUser?.id

  const [tab, setTab] = useState('overview') // overview | listings | tenants
  const [dashboard, setDashboard] = useState(null)
  const [tenantsData, setTenantsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tenantModalListing, setTenantModalListing] = useState(null)

  const loadDashboard = () => {
    fetch(`${API}/${landlordId}/dashboard`)
      .then(r => r.json())
      .then(data => { if (data.success) setDashboard(data.data) })
  }

  const loadTenants = () => {
    fetch(`${API}/${landlordId}/tenants`)
      .then(r => r.json())
      .then(data => { if (data.success) setTenantsData(data.data) })
  }

  useEffect(() => {
    if (!landlordId) { setLoading(false); return }
    Promise.all([
      fetch(`${API}/${landlordId}/dashboard`).then(r => r.json()),
      fetch(`${API}/${landlordId}/tenants`).then(r => r.json())
    ]).then(([d, t]) => {
      if (d.success) setDashboard(d.data)
      if (t.success) setTenantsData(t.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [landlordId])

  const respondToRequest = async (id, status) => {
    await fetch(`${API}/viewing-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    loadTenants()
  }

  const endTenancy = async (id) => {
    await fetch(`${API}/tenancies/${id}/end`, { method: 'PUT' })
    loadDashboard()
    loadTenants()
  }

  if (!currentUser || currentUser.role !== 'landlord') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center px-4">
        <div className="text-center">
          <i className="fa-solid fa-chart-line text-slate-300 text-4xl mb-4"></i>
          <h2 className="text-lg font-bold text-slate-700 mb-2">Landlord account required</h2>
          <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">Sign In</Link>
        </div>
      </div>
    )
  }

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <p className="text-slate-500">Loading your dashboard...</p>
      </div>
    )
  }

  const revenueData = dashboard.revenue_by_month.map(r => ({
    month: new Date(r.month + '-01').toLocaleDateString('en-GB', { month: 'short' }),
    revenue: Number(r.total)
  }))

  const pendingRequests = (tenantsData?.viewing_requests || []).filter(v => v.status === 'pending')

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">

        <div className="flex items-center justify-between mb-6 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Multi-Property Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Everything about your portfolio, in one place.</p>
          </div>
          <Link to={`/landlord/${landlordId}`} className="text-sm font-medium text-blue-700 hover:underline">
            View public profile →
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border border-slate-200 rounded-lg overflow-hidden mb-6 bg-white w-fit">
          {[
            { key: 'overview', label: 'Overview & Analytics', icon: 'fa-chart-simple' },
            { key: 'listings', label: 'Vacancies & Listings', icon: 'fa-house' },
            { key: 'tenants', label: 'Tenant Contacts Hub', icon: 'fa-address-book' }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${tab === t.key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <i className={`fa-solid ${t.icon}`}></i>{t.label}
              {t.key === 'tenants' && pendingRequests.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingRequests.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon="fa-house" label="Total Units" value={dashboard.total_units} color="bg-blue-50 text-blue-700" />
              <StatCard icon="fa-key" label="Occupied" value={dashboard.occupied_units} color="bg-green-50 text-green-700" />
              <StatCard icon="fa-door-open" label="Vacant" value={dashboard.vacant_units} color="bg-amber-50 text-amber-700" />
              <StatCard icon="fa-percent" label="Occupancy Rate" value={`${dashboard.occupancy_rate}%`} color="bg-purple-50 text-purple-700" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Occupancy Bar Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-700 mb-4">Occupancy by Property</h2>
                {dashboard.occupancy_by_property.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No listings yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.occupancy_by_property}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="property_group" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="occupied" stackId="a" fill="#1d4ed8" name="Occupied" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="vacant" stackId="a" fill="#fbbf24" name="Vacant" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Revenue Line Graph */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-700 mb-4">Monthly Revenue (Last 6 Months)</h2>
                {revenueData.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No recorded payments yet. Record a payment from the Tenant Contacts Hub.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={v => `৳${Number(v).toLocaleString()}`} />
                      <Line type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VACANCIES & LISTINGS TAB ── */}
        {tab === 'listings' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700">All Units</h2>
              <Link to="/post-listing" className="text-xs font-semibold text-blue-700 hover:underline">+ Post New Listing</Link>
            </div>
            {dashboard.listings.length === 0 ? (
              <p className="text-sm text-slate-400 italic">You haven't posted any listings yet.</p>
            ) : (
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-2 pr-4 font-medium">Unit</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Rent (৳)</th>
                    <th className="py-2 pr-4 font-medium">Listing Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.listings.map(l => (
                    <QuickEditRow key={l.id} listing={l} landlordId={landlordId}
                      onUpdated={loadDashboard} onOpenTenant={setTenantModalListing} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TENANT CONTACTS HUB TAB ── */}
        {tab === 'tenants' && (
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Active tenants */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Active Tenants</h2>
              {(!tenantsData || tenantsData.tenants.length === 0) ? (
                <p className="text-sm text-slate-400 italic">No active tenants yet.</p>
              ) : (
                <div className="space-y-3">
                  {tenantsData.tenants.map(t => (
                    <div key={t.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{t.tenant_name}</p>
                        <p className="text-xs text-slate-400">{t.listing_title} · ৳{Number(t.rent_amount).toLocaleString()}/mo</p>
                        {t.tenant_phone && <p className="text-xs text-slate-400">{t.tenant_phone}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => endTenancy(t.id)} className="text-xs text-red-500 hover:underline">End Tenancy</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Viewing requests */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Viewing Requests</h2>
              {(!tenantsData || tenantsData.viewing_requests.length === 0) ? (
                <p className="text-sm text-slate-400 italic">No viewing requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {tenantsData.viewing_requests.map(v => (
                    <div key={v.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-slate-800">{v.student_name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          v.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          v.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>{v.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">{v.listing_title}{v.requested_date ? ` · wants to view ${new Date(v.requested_date).toLocaleDateString()}` : ''}</p>
                      {v.message && <p className="text-xs text-slate-500 mb-2">"{v.message}"</p>}
                      {v.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => respondToRequest(v.id, 'approved')} className="text-xs font-semibold text-green-700 hover:underline">Approve</button>
                          <button onClick={() => respondToRequest(v.id, 'declined')} className="text-xs font-semibold text-red-500 hover:underline">Decline</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {tenantModalListing && (
        <AddTenantForm
          listing={tenantModalListing}
          landlordId={landlordId}
          onClose={() => setTenantModalListing(null)}
          onSaved={() => { loadDashboard(); loadTenants() }}
        />
      )}
    </div>
  )
}

export default LandlordDashboard