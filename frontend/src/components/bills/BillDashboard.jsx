import { useState, useEffect, useCallback } from 'react'
import {
  computeNetBalances,
  formatBDT,
} from '../../utils/expenseCalculations'
import AddExpenseModal from './AddExpenseModal'
import SettleUpModal from './SettleUpModal'
import ExpenseList from './ExpenseList'
import BalanceMatrix from './BalanceMatrix'

// ── Fallback Mock Data for Offline & Demo Exploration ─────────────────────────
const MOCK_CURRENT_USER = {
  id: 1,
  full_name: 'Shuva Das',
  email: 'shuva.das@g.bracu.ac.bd',
}

const MOCK_MEMBERS = [
  { id: 1, full_name: 'Shuva Das', email: 'shuva.das@g.bracu.ac.bd' },
  { id: 2, full_name: 'Tanvir Ahmed', email: 'tanvir.ahmed@g.bracu.ac.bd' },
  { id: 3, full_name: 'Nafis Fuad', email: 'nafis.fuad@g.bracu.ac.bd' },
  { id: 4, full_name: 'Ayesha Rahman', email: 'ayesha.rahman@g.bracu.ac.bd' },
]

const MOCK_EXPENSES = [
  {
    id: 101,
    group_id: 1,
    payer_id: 1,
    payer_name: 'Shuva Das',
    title: 'Carnival High-Speed Wi-Fi (50 Mbps)',
    amount: 1500,
    category: 'wifi',
    split_type: 'EQUAL',
    expense_date: '2026-08-01',
    notes: 'Monthly connection bill',
    splits: [
      { id: 1, expense_id: 101, user_id: 1, user_name: 'Shuva Das', amount_owed: 375 },
      { id: 2, expense_id: 101, user_id: 2, user_name: 'Tanvir Ahmed', amount_owed: 375 },
      { id: 3, expense_id: 101, user_id: 3, user_name: 'Nafis Fuad', amount_owed: 375 },
      { id: 4, expense_id: 101, user_id: 4, user_name: 'Ayesha Rahman', amount_owed: 375 },
    ],
  },
  {
    id: 102,
    group_id: 1,
    payer_id: 2,
    payer_name: 'Tanvir Ahmed',
    title: 'DESCO Prepaid Electricity Card Recharged',
    amount: 3200,
    category: 'electricity',
    split_type: 'EQUAL',
    expense_date: '2026-08-05',
    notes: 'Prepaid meter top-up',
    splits: [
      { id: 5, expense_id: 102, user_id: 1, user_name: 'Shuva Das', amount_owed: 800 },
      { id: 6, expense_id: 102, user_id: 2, user_name: 'Tanvir Ahmed', amount_owed: 800 },
      { id: 7, expense_id: 102, user_id: 3, user_name: 'Nafis Fuad', amount_owed: 800 },
      { id: 8, expense_id: 102, user_id: 4, user_name: 'Ayesha Rahman', amount_owed: 800 },
    ],
  },
  {
    id: 103,
    group_id: 1,
    payer_id: 3,
    payer_name: 'Nafis Fuad',
    title: 'Shared Kitchen Essentials & Spices',
    amount: 1800,
    category: 'groceries',
    split_type: 'EQUAL',
    expense_date: '2026-08-10',
    notes: 'Oil, salt, rice, and cleaning detergents',
    splits: [
      { id: 9, expense_id: 103, user_id: 1, user_name: 'Shuva Das', amount_owed: 450 },
      { id: 10, expense_id: 103, user_id: 2, user_name: 'Tanvir Ahmed', amount_owed: 450 },
      { id: 11, expense_id: 103, user_id: 3, user_name: 'Nafis Fuad', amount_owed: 450 },
      { id: 12, expense_id: 103, user_id: 4, user_name: 'Ayesha Rahman', amount_owed: 450 },
    ],
  },
  {
    id: 104,
    group_id: 1,
    payer_id: 4,
    payer_name: 'Ayesha Rahman',
    title: 'Cooking & Cleaning Maid Monthly Salary',
    amount: 4000,
    category: 'maid',
    split_type: 'EQUAL',
    expense_date: '2026-08-15',
    notes: 'Paid cash for August',
    splits: [
      { id: 13, expense_id: 104, user_id: 1, user_name: 'Shuva Das', amount_owed: 1000 },
      { id: 14, expense_id: 104, user_id: 2, user_name: 'Tanvir Ahmed', amount_owed: 1000 },
      { id: 15, expense_id: 104, user_id: 3, user_name: 'Nafis Fuad', amount_owed: 1000 },
      { id: 16, expense_id: 104, user_id: 4, user_name: 'Ayesha Rahman', amount_owed: 1000 },
    ],
  },
]

const MOCK_SETTLEMENTS = [
  {
    id: 501,
    group_id: 1,
    payer_id: 1,
    payer_name: 'Shuva Das',
    receiver_id: 2,
    receiver_name: 'Tanvir Ahmed',
    amount: 500,
    payment_method: 'bkash',
    notes: 'bKash TrxID #9XJ81K',
    settled_at: '2026-08-12T14:30:00Z',
  },
]

export default function BillDashboard() {
  const [user, setUser]                 = useState(() => JSON.parse(localStorage.getItem('ff_user') || 'null') || MOCK_CURRENT_USER)
  const [groupId, setGroupId]           = useState(null)
  const [groupName, setGroupName]       = useState('Flatfolks Cohort Group')
  const [members, setMembers]           = useState(MOCK_MEMBERS)
  const [expenses, setExpenses]         = useState(MOCK_EXPENSES)
  const [settlements, setSettlements]   = useState(MOCK_SETTLEMENTS)
  const [isMockMode, setIsMockMode]     = useState(false)
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState('expenses') // 'expenses' | 'balances'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false)
  const [settlePreload, setSettlePreload]   = useState({ payerId: null, receiverId: null, amount: null })

  const [toastMessage, setToastMessage]     = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Fetch real group and bills from backend
  const loadGroupBills = useCallback(async () => {
    setLoading(true)
    const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null') || MOCK_CURRENT_USER
    setUser(currentUser)

    try {
      // 1. Fetch user's active group
      const grpRes = await fetch(`http://localhost:8000/api/roommates/my-group?user_id=${currentUser.id}`)
      const grpData = await grpRes.json()

      if (grpData.success && grpData.group) {
        const gid = grpData.group.id
        setGroupId(gid)
        setGroupName(grpData.group.name || 'Flatfolks Group')

        // 2. Fetch bills for this group
        const billsRes = await fetch(`http://localhost:8000/api/bills/group/${gid}`)
        const billsData = await billsRes.json()

        if (billsData.success) {
          const apiMembers = (billsData.data.members?.length > 0 ? billsData.data.members : grpData.group.members) || []
          // Ensure current user is in members list if missing
          const fullMembersList = apiMembers.length > 0 ? apiMembers : [currentUser]
          setGroupName(billsData.data.groupName || grpData.group.name || 'Flatmates Group')
          setMembers(fullMembersList)
          setExpenses(billsData.data.expenses || [])
          setSettlements(billsData.data.settlements || [])
          setIsMockMode(false)
          setLoading(false)
          return
        }
      }

      // If no group found on backend or DB offline, gracefully switch to mock data
      console.info('No active database group found. Loading interactive demonstration mock data.')
      setIsMockMode(true)
      setMembers(MOCK_MEMBERS)
      setExpenses(MOCK_EXPENSES)
      setSettlements(MOCK_SETTLEMENTS)
      setGroupName('Demo Flatmates (Offline Mode)')
    } catch (err) {
      console.error('API connection failed in BillDashboard. Falling back to mock data:', err)
      setIsMockMode(true)
      setMembers(MOCK_MEMBERS)
      setExpenses(MOCK_EXPENSES)
      setSettlements(MOCK_SETTLEMENTS)
      setGroupName('Demo Flatmates (Offline Mode)')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroupBills()
  }, [loadGroupBills])

  // Compute live balances
  const loggedInUser = JSON.parse(localStorage.getItem('ff_user') || 'null') || user || MOCK_CURRENT_USER
  const matchedMember = members.find(
    (m) =>
      m.id === loggedInUser?.id ||
      m.email?.toLowerCase() === loggedInUser?.email?.toLowerCase() ||
      m.full_name?.toLowerCase() === loggedInUser?.full_name?.toLowerCase()
  )
  const currentUserId = matchedMember?.id || loggedInUser?.id || members[0]?.id || 1

  const netBalances = computeNetBalances(members, expenses, settlements)
  const myNetData = netBalances[currentUserId] || { net: 0, paid: 0, share: 0 }

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
    if (isMockMode) {
      // Mock mode local state update
      const payerObj = members.find((m) => m.id === expenseData.payer_id)
      const payerName = expenseData.payer_id ? (payerObj?.full_name || 'Roommate') : 'Nobody yet (Pending Bill)'
      if (expenseData.id) {
        // Edit existing
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expenseData.id
              ? {
                  ...e,
                  ...expenseData,
                  payer_name: payerName,
                  splits: expenseData.splits.map((s) => {
                    const mem = members.find((m) => m.id === (s.user_id || s.userId))
                    return { ...s, user_name: mem?.full_name || 'Roommate' }
                  }),
                }
              : e
          )
        )
        showToast('Expense updated.')
      } else {
        // Add new
        const newExp = {
          ...expenseData,
          id: Date.now(),
          payer_name: payerName,
          splits: expenseData.splits.map((s) => {
            const mem = members.find((m) => m.id === (s.user_id || s.userId))
            return { ...s, user_name: mem?.full_name || 'Roommate' }
          }),
        }
        setExpenses((prev) => [newExp, ...prev])
        showToast('Expense logged successfully!')
      }
      return
    }

    // Live API call
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
      throw err
    }
  }

  const handleDeleteExpense = async (id) => {
    if (isMockMode) {
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      showToast('Expense removed.')
      return
    }

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
    if (isMockMode) {
      const payerObj = members.find((m) => m.id === settleData.payer_id)
      const recObj = members.find((m) => m.id === settleData.receiver_id)

      const newSettle = {
        ...settleData,
        id: Date.now(),
        payer_name: payerObj?.full_name || 'Roommate',
        receiver_name: recObj?.full_name || 'Roommate',
        settled_at: new Date().toISOString(),
      }
      setSettlements((prev) => [newSettle, ...prev])
      showToast(`Settlement of ${formatBDT(settleData.amount)} recorded!`)
      return
    }

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

                {isMockMode && (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold rounded-full flex items-center gap-1">
                    <i className="fa-solid fa-flask"></i>
                    Demo / Interactive Mock Mode
                  </span>
                )}
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
                className="px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <i className="fa-solid fa-hand-holding-dollar text-sm"></i>
                <span>Settle Up</span>
              </button>

              <button
                onClick={() => {
                  setEditingExpense(null)
                  setIsAddModalOpen(true)
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
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
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
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
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
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
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-3"></i>
            <p className="text-xs text-slate-500 font-semibold">Loading shared bills & calculations...</p>
          </div>
        ) : activeTab === 'expenses' ? (
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
    </div>
  )
}
