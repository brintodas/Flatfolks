import { useState } from 'react'
import { CATEGORIES, formatBDT } from '../../utils/expenseCalculations'

export default function ExpenseList({
  expenses = [],
  currentUserId,
  onEditExpense,
  onDeleteExpense,
  onAddExpenseClick,
}) {
  const [searchTerm, setSearchTerm]       = useState('')
  const [selectedCategory, setSelectedCat] = useState('all')
  const [sortBy, setSortBy]               = useState('date_desc')
  const [expandedId, setExpandedId]       = useState(null)
  const [deletingId, setDeletingId]       = useState(null)

  // Filter & Search
  const filtered = expenses.filter((exp) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.payer_name && exp.payer_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCat = selectedCategory === 'all' || exp.category === selectedCategory
    return matchesSearch && matchesCat
  })

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.expense_date || b.created_at) - new Date(a.expense_date || a.created_at)
    if (sortBy === 'date_asc') return new Date(a.expense_date || a.created_at) - new Date(b.expense_date || b.created_at)
    if (sortBy === 'amount_desc') return Number(b.amount) - Number(a.amount)
    if (sortBy === 'amount_asc') return Number(a.amount) - Number(b.amount)
    return 0
  })

  const getCategoryMeta = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || {
      id: 'other',
      label: 'Other',
      icon: 'fa-receipt',
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return
    }
    setDeletingId(id)
    try {
      await onDeleteExpense(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search bills, payers, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Categories ({expenses.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
            <i className="fa-solid fa-receipt"></i>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No shared bills found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {searchTerm || selectedCategory !== 'all'
              ? 'No expenses matched your search or category filters.'
              : 'Keep track of Wi-Fi, electricity, maid, or grocery bills with your flatmates.'}
          </p>
          <button
            onClick={onAddExpenseClick}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add First Expense</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exp) => {
            const cat = getCategoryMeta(exp.category)
            const isUnpaid = !exp.payer_id || exp.payer_id === 'unpaid'
            const isPayer = !isUnpaid && String(exp.payer_id) === String(currentUserId)
            const isExpanded = expandedId === exp.id
            const mySplit = exp.splits?.find((s) => String(s.user_id || s.userId) === String(currentUserId))

            return (
              <div
                key={exp.id}
                className={`bg-white rounded-2xl border ${
                  isUnpaid ? 'border-amber-200/80 bg-amber-50/20' : 'border-slate-100 hover:border-slate-200'
                } shadow-sm hover:shadow transition-all overflow-hidden`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Category Icon + Title & Payer */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base shrink-0 border ${
                          isUnpaid ? 'bg-amber-100 text-amber-700 border-amber-300' : cat.color
                        }`}
                      >
                        <i className={`fa-solid ${isUnpaid ? 'fa-hourglass-half' : cat.icon}`}></i>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {exp.title}
                          </h4>
                          {isUnpaid ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wider bg-amber-100/80 text-amber-800 border-amber-300 flex items-center gap-1">
                              <i className="fa-solid fa-clock text-[9px]"></i> Pending Payment
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wider ${cat.color}`}
                            >
                              {cat.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <span>
                            <i className="fa-regular fa-calendar text-[11px] mr-1 text-slate-400"></i>
                            {new Date(exp.expense_date || exp.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            Paid by{' '}
                            {isUnpaid ? (
                              <strong className="font-semibold text-amber-800">
                                Nobody yet (Pending Bill)
                              </strong>
                            ) : (
                              <strong className="font-semibold text-slate-700">
                                {isPayer ? 'You' : exp.payer_name || 'Roommate'}
                              </strong>
                            )}
                          </span>
                          {exp.splits?.length > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                Split between {exp.splits.length} roommate{exp.splits.length > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>

                        {exp.notes && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 inline-block">
                            <i className="fa-solid fa-note-sticky text-slate-400 mr-1 text-[11px]"></i>
                            {exp.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Total Amount & Your Standing */}
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900">
                        {formatBDT(exp.amount)}
                      </div>

                      {/* User's Contextual Status */}
                      {isUnpaid ? (
                        mySplit ? (
                          <div className="text-[11px] font-bold text-amber-700 mt-0.5">
                            Your share: {formatBDT(mySplit.amount_owed || mySplit.amount)} (Pending)
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                            Not involved
                          </div>
                        )
                      ) : isPayer ? (
                        <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                          You paid {formatBDT(exp.amount)}
                        </div>
                      ) : mySplit ? (
                        <div className="text-[11px] font-bold text-rose-600 mt-0.5">
                          You owe {formatBDT(mySplit.amount_owed || mySplit.amount)}
                        </div>
                      ) : (
                        <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                          Not involved
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                      <span>{isExpanded ? 'Hide Breakdown' : 'View Split Breakdown'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Expense"
                      >
                        <i className="fa-solid fa-pencil text-xs"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id, exp.title)}
                        disabled={deletingId === exp.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Expense"
                      >
                        {deletingId === exp.id ? (
                          <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                        ) : (
                          <i className="fa-regular fa-trash-can text-xs"></i>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Split Detail Table */}
                {isExpanded && (
                  <div className="bg-slate-50/80 px-5 py-4 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-slate-700 mb-2.5">
                      Individual Share Breakdown:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {exp.splits?.map((split) => {
                        const isYou = String(split.user_id || split.userId) === String(currentUserId)
                        return (
                          <div
                            key={split.id || split.user_id}
                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {(split.user_name || 'R')
                                  .split(' ')
                                  .map((w) => w[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800 truncate">
                                {split.user_name || 'Roommate'} {isYou ? '(You)' : ''}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0">
                              {formatBDT(split.amount_owed || split.amount)}
                              {split.percentage && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  ({Number(split.percentage).toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
