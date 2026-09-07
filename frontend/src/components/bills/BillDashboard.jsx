import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  computeNetBalances,
  formatBDT,
} from '../../utils/expenseCalculations'
import AddExpenseModal from './AddExpenseModal'
import SettleUpModal from './SettleUpModal'
import ExpenseList from './ExpenseList'
import BalanceMatrix from './BalanceMatrix'

const DHAKA_AREAS = [
  'Badda',
  'Aftabnagar',
  'Banani',
  'Gulshan',
  'Dhanmondi',
  'Bashundhara',
  'Mirpur',
  'Uttara',
  'Mohakhali',
  'Khilgaon',
  'Malibagh',
  'Rampura',
  'Mohammadpur',
  'Lalmatia',
  'Baridhara',
  'Nikunja',
  'Farmgate',
  'Panthapath',
  'Shantinagar',
  'Bailey Road',
  'Wari',
  'Old Dhaka',
  'Mogbazar',
  'Tejgaon',
  'Cantonment',
  'Elephant Road',
  'Segunbagicha',
  'Motijheel',
  'Kakrail',
  'Khilkhet',
]

export default function BillDashboard() {
  const [user, setUser]                 = useState(() => JSON.parse(localStorage.getItem('ff_user') || 'null'))
  const [groupId, setGroupId]           = useState(null)
  const [groupName, setGroupName]       = useState('')
  const [members, setMembers]           = useState([])
  const [expenses, setExpenses]         = useState([])
  const [settlements, setSettlements]   = useState([])
  const [hasGroup, setHasGroup]         = useState(null) // null = loading
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState('expenses') // 'expenses' | 'balances'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false)
  const [settlePreload, setSettlePreload]   = useState({ payerId: null, receiverId: null, amount: null })

  // Register Living Space Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    apartment_name: '',
    address: '',
    area: 'Badda',
    monthly_rent: '',
    bedrooms: '2',
    bathrooms: '2',
    kitchens: '1',
    size_sqft: '1000',
    contact_phone: user?.phone || '',
  })
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const [toastMessage, setToastMessage]     = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Fetch real group and bills from backend database
  const loadGroupBills = useCallback(async () => {
    setLoading(true)
    const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
    setUser(currentUser)

    if (!currentUser?.id) {
      setHasGroup(false)
      setGroupId(null)
      setMembers([])
      setExpenses([])
      setSettlements([])
      setLoading(false)
      return
    }

    try {
      // 1. Fetch user's active group from database
      const grpRes = await fetch(`http://localhost:8000/api/roommates/my-group?user_id=${currentUser.id}`)
      const grpData = await grpRes.json()

      if (grpData.success && grpData.group) {
        const gid = grpData.group.id
        setGroupId(gid)
        setGroupName(grpData.group.name || 'Flatmates Group')

        // 2. Fetch bills for this specific group from database
        const billsRes = await fetch(`http://localhost:8000/api/bills/group/${gid}?user_id=${currentUser.id}`)
        const billsData = await billsRes.json()

        if (billsData.success) {
          const apiMembers = billsData.data.members?.length > 0 ? billsData.data.members : grpData.group.members || []
          setGroupName(billsData.data.groupName || grpData.group.name || 'Flatmates Group')
          setMembers(apiMembers)
          setExpenses(billsData.data.expenses || [])
          setSettlements(billsData.data.settlements || [])
          setHasGroup(true)
          setLoading(false)
          return
        }
      }

      // No active group found in DB
      setHasGroup(false)
      setGroupId(null)
      setMembers([])
      setExpenses([])
      setSettlements([])
    } catch (err) {
      console.error('Failed to load group bills:', err)
      setHasGroup(false)
      setMembers([])
      setExpenses([])
      setSettlements([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroupBills()
  }, [loadGroupBills])

  // Handle Living Space Registration Submission
  const handleRegisterLivingSpace = async (e) => {
    e.preventDefault()
    if (!user?.id) return
    setRegistering(true)
    setRegisterError('')

    try {
      const res = await fetch('http://localhost:8000/api/maintenance/register-living-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          apartment_name: registerForm.apartment_name,
          address: registerForm.address,
          area: registerForm.area,
          monthly_rent: Number(registerForm.monthly_rent),
          bedrooms: Number(registerForm.bedrooms) || 1,
          bathrooms: Number(registerForm.bathrooms) || 1,
          kitchens: Number(registerForm.kitchens) || 1,
          size_sqft: Number(registerForm.size_sqft) || null,
          contact_phone: registerForm.contact_phone,
        }),
      })
      const json = await res.json()
      if (json.success && json.group) {
        setShowRegisterModal(false)
        showToast('Living space registered successfully!')
        loadGroupBills()
      } else {
        setRegisterError(json.message || 'Failed to register living space.')
      }
    } catch (err) {
      console.error('Error registering flat:', err)
      setRegisterError('Network error while registering living space.')
    } finally {
      setRegistering(false)
    }
  }

  // Compute live balances
  const loggedInUser = JSON.parse(localStorage.getItem('ff_user') || 'null') || user
  const matchedMember = members.find(
    (m) =>
      m.id === loggedInUser?.id ||
      m.email?.toLowerCase() === loggedInUser?.email?.toLowerCase() ||
      m.full_name?.toLowerCase() === loggedInUser?.full_name?.toLowerCase()
  )
  const currentUserId = matchedMember?.id || loggedInUser?.id || members[0]?.id || null

  const netBalances = computeNetBalances(members, expenses, settlements)
  const myNetData = (currentUserId && netBalances[currentUserId]) || { net: 0, paid: 0, share: 0 }

  const totalGroupSpend = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

  // Calculate user total owed and total owed to user across the group
  let userOwes = 0
  let userOwed = 0
  if (myNetData.net < -0.01) {
    userOwes = Math.abs(myNetData.net)
  } else if (myNetData.net > 0.01) {
    userOwed = myNetData.net
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveExpense = async (expenseData) => {
    try {
      const isEdit = Boolean(expenseData.id)
      const url = isEdit ? `http://localhost:8000/api/bills/${expenseData.id}` : 'http://localhost:8000/api/bills'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          group_id: groupId,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Failed to save expense')

      showToast(isEdit ? 'Expense updated successfully!' : 'Expense added successfully!')
      loadGroupBills()
    } catch (err) {
      console.error('Save expense error:', err)
      showToast(err.message || 'Could not save expense.', 'error')
      throw err
    }
  }

  const handleDeleteExpense = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bills/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Failed to delete expense')
      showToast('Expense deleted successfully.')
      loadGroupBills()
    } catch (err) {
      console.error('Delete expense error:', err)
      showToast(err.message || 'Could not delete expense.', 'error')
    }
  }

  const handleRecordSettlement = async (settleData) => {
    try {
      const res = await fetch('http://localhost:8000/api/bills/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settleData,
          group_id: groupId,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Failed to record settlement')

      showToast('Settlement recorded successfully!')
      loadGroupBills()
    } catch (err) {
      console.error('Settlement error:', err)
      showToast(err.message || 'Could not record settlement.', 'error')
      throw err
    }
  }

  const openSettleModalWithParams = ({ payerId, receiverId, amount }) => {
    setSettlePreload({ payerId, receiverId, amount })
    setIsSettleModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
              toastMessage.type === 'error'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-emerald-600 text-white border-emerald-700'
            }`}
          >
            <i className={`fa-solid ${toastMessage.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-blue-600 mb-3"></i>
            <p className="text-sm font-semibold text-slate-600">Loading your shared flat expenses...</p>
          </div>
        ) : !user ? (
          /* Not Logged In */
          <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Sign In to View Flat Bills</h2>
            <p className="text-sm text-slate-500 mb-6">
              Please sign in to your Flatfolks account to view and manage shared bills with your roommates.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition shadow-md"
            >
              <i className="fa-solid fa-right-to-bracket text-sm"></i>
              Sign In Now
            </Link>
          </div>
        ) : !hasGroup ? (
          /* Logged in but has no flat registered */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-amber-200 shadow-sm text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 text-amber-600 text-2xl">
              <i className="fa-solid fa-house-chimney-crack"></i>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-3 border border-amber-200">
              <i className="fa-solid fa-triangle-exclamation mr-1.5 text-[11px]"></i>
              Living Place Not Registered
            </span>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Register Your Living Place to Track Shared Bills
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              You are not currently linked to a flat or roommate group on Flatfolks. Shared flat expenses and settlement balances are strictly private to flatmates living together. Register your apartment or join your roommates below to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-house-circle-check"></i>
                Register Your Living Space
              </button>
              <Link
                to="/roommates"
                className="w-full sm:w-auto px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-user-group"></i>
                Find Roommates & Join Flat
              </Link>
            </div>
          </div>
        ) : (
          /* Active Flat Bills Dashboard */
          <>
            {/* ── Top Header Banner ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full border border-blue-100">
                      <i className="fa-solid fa-users mr-1.5"></i>
                      {groupName}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                      {members.length} {members.length === 1 ? 'Roommate' : 'Roommates'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                    Shared Bills & Expense Tracker
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                    Log shared flat utilities, split Wi-Fi & groceries, and track real-time settlement balances with your roommates.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      setSettlePreload({ payerId: null, receiverId: null, amount: null })
                      setIsSettleModalOpen(true)
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-hand-holding-dollar text-sm"></i>
                    <span>Settle Up</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingExpense(null)
                      setIsAddModalOpen(true)
                    }}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus text-sm"></i>
                    <span>Add Expense</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Group Spend */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Group Spend</p>
                  <h3 className="text-xl font-black text-slate-900 truncate mt-0.5">
                    {formatBDT(totalGroupSpend)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{expenses.length} bills logged</p>
                </div>
              </div>

              {/* You Owe */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-arrow-trend-down"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">You Owe</p>
                  <h3 className="text-xl font-black text-rose-600 truncate mt-0.5">
                    {formatBDT(userOwes)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {userOwes > 0 ? 'Pending payments to roommates' : 'No outstanding debt'}
                  </p>
                </div>
              </div>

              {/* You Are Owed */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">You Are Owed</p>
                  <h3 className="text-xl font-black text-emerald-600 truncate mt-0.5">
                    {formatBDT(userOwed)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {userOwed > 0 ? 'To be received from roommates' : 'No pending credits'}
                  </p>
                </div>
              </div>

              {/* Net Standing */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                    myNetData.net > 0.01
                      ? 'bg-emerald-100 text-emerald-700'
                      : myNetData.net < -0.01
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Net Balance</p>
                  <h3
                    className={`text-xl font-black truncate mt-0.5 ${
                      myNetData.net > 0.01
                        ? 'text-emerald-600'
                        : myNetData.net < -0.01
                        ? 'text-rose-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {myNetData.net > 0.01
                      ? `+${formatBDT(myNetData.net)}`
                      : formatBDT(myNetData.net)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {myNetData.net > 0.01
                      ? 'Overall in positive credit'
                      : myNetData.net < -0.01
                      ? 'Overall in debt'
                      : 'Completely balanced'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Main Section Tabs ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'bg-blue-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-list-check"></i>
                <span>Expenses & Bills ({expenses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('balances')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'balances'
                    ? 'bg-blue-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-handshake text-xs"></i>
                <span>Balances & Settle Matrix</span>
              </button>
            </div>

            {/* ── Tab Content ─────────────────────────────────────────────────────── */}
            {activeTab === 'expenses' ? (
              <ExpenseList
                expenses={expenses}
                currentUserId={currentUserId}
                onEditExpense={(exp) => {
                  setEditingExpense(exp)
                  setIsAddModalOpen(true)
                }}
                onDeleteExpense={handleDeleteExpense}
                onAddExpenseClick={() => {
                  setEditingExpense(null)
                  setIsAddModalOpen(true)
                }}
              />
            ) : (
              <BalanceMatrix
                members={members}
                expenses={expenses}
                settlements={settlements}
                currentUserId={currentUserId}
                onOpenSettleModal={openSettleModalWithParams}
              />
            )}
          </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingExpense(null)
        }}
        onSave={handleSaveExpense}
        members={members}
        currentUserId={currentUserId}
        editExpense={editingExpense}
      />

      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        onSettle={handleRecordSettlement}
        members={members}
        currentUserId={currentUserId}
        initialPayerId={settlePreload.payerId}
        initialReceiverId={settlePreload.receiverId}
        initialAmount={settlePreload.amount}
      />

      {/* ── Register Living Space Modal ─────────────────────────────────────── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <i className="fa-solid fa-house-circle-check text-sm"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Register Your Living Space
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add your flat details to enable shared bills & maintenance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterLivingSpace} className="p-6 space-y-4">
              {registerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
                  <span>{registerError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apartment / Flat Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Green View Flat 4B"
                    value={registerForm.apartment_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, apartment_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area in Dhaka <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={registerForm.area}
                    onChange={(e) => setRegisterForm({ ...registerForm, area: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  >
                    {DHAKA_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Address of Apartment <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House 14, Road 7/A, Block C, Badda, Dhaka"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Rent (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    required
                    placeholder="e.g. 18000"
                    value={registerForm.monthly_rent}
                    onChange={(e) => setRegisterForm({ ...registerForm, monthly_rent: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approximate Size (sq ft)
                  </label>
                  <input
                    type="number"
                    min="100"
                    placeholder="e.g. 1200"
                    value={registerForm.size_sqft}
                    onChange={(e) => setRegisterForm({ ...registerForm, size_sqft: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Rooms breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={registerForm.bedrooms}
                    onChange={(e) => setRegisterForm({ ...registerForm, bedrooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={registerForm.bathrooms}
                    onChange={(e) => setRegisterForm({ ...registerForm, bathrooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kitchens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={registerForm.kitchens}
                    onChange={(e) => setRegisterForm({ ...registerForm, kitchens: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01712-345678"
                  value={registerForm.contact_phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, contact_phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {registering ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Confirm & Register</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
