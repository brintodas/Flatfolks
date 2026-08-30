import {
  simplifyDebts,
  computeNetBalances,
  formatBDT,
  PAYMENT_METHODS,
} from '../../utils/expenseCalculations'

export default function BalanceMatrix({
  members = [],
  expenses = [],
  settlements = [],
  currentUserId,
  onOpenSettleModal,
}) {
  // Compute net balance per member
  const netBalances = computeNetBalances(members, expenses, settlements)

  // Compute simplified debt transactions
  const simplifiedTransactions = simplifyDebts(netBalances)

  const getMethodMeta = (mId) => {
    return (
      PAYMENT_METHODS.find((p) => p.id === mId) || {
        id: 'other',
        label: 'Other',
        icon: 'fa-credit-card',
        color: 'text-slate-600 bg-slate-50 border-slate-200',
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: Simplified Debts / Settle Up Summary ────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-arrows-split-up-and-left text-blue-600"></i>
              Simplified Group Settlements
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Algorithmically minimized transactions so everyone gets settled with the fewest payments.
            </p>
          </div>
        </div>

        {simplifiedTransactions.length === 0 ? (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h4 className="text-sm font-bold text-emerald-900">All Settled Up!</h4>
            <p className="text-xs text-emerald-700 mt-1">
              No outstanding debts among flatmates in this group.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {simplifiedTransactions.map((tx, idx) => {
              const isYouDebtor = String(tx.fromUser?.id) === String(currentUserId)
              const isYouCreditor = String(tx.toUser?.id) === String(currentUserId)

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isYouDebtor
                      ? 'bg-rose-50/50 border-rose-200'
                      : isYouCreditor
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatars */}
                    <div className="flex items-center -space-x-2 shrink-0">
                      <div className="w-9 h-9 rounded-full bg-rose-100 border-2 border-white text-rose-700 text-xs font-bold flex items-center justify-center shadow-sm">
                        {(tx.fromUser?.full_name || tx.fromUser?.name || 'A')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-emerald-100 border-2 border-white text-emerald-700 text-xs font-bold flex items-center justify-center shadow-sm">
                        {(tx.toUser?.full_name || tx.toUser?.name || 'B')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        <span className="font-bold text-slate-900">
                          {isYouDebtor ? 'You' : tx.fromUser?.full_name || tx.fromUser?.name}
                        </span>{' '}
                        owes{' '}
                        <span className="font-bold text-slate-900">
                          {isYouCreditor ? 'You' : tx.toUser?.full_name || tx.toUser?.name}
                        </span>
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {formatBDT(tx.amount)}
                      </p>
                    </div>
                  </div>

                  {isYouDebtor ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenSettleModal({
                          payerId: tx.fromUser?.id,
                          receiverId: tx.toUser?.id,
                          amount: tx.amount,
                        })
                      }
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                    >
                      <i className="fa-solid fa-money-bill-wave text-xs"></i>
                      <span>Pay & Settle</span>
                    </button>
                  ) : isYouCreditor ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenSettleModal({
                          payerId: tx.fromUser?.id,
                          receiverId: tx.toUser?.id,
                          amount: tx.amount,
                        })
                      }
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Record Payment</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100/90 rounded-xl border border-slate-200 flex items-center gap-1.5 shrink-0 select-none">
                      <i className="fa-regular fa-eye text-[11px] text-slate-400"></i>
                      <span>View Only</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Individual Flatmate Balance Ledger ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-scale-balanced text-blue-600"></i>
          Flatmate Balance Ledger
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {members.map((member) => {
            const data = netBalances[member.id] || { net: 0, paid: 0, share: 0 }
            const isYou = String(member.id) === String(currentUserId)
            const isPositive = data.net > 0.01
            const isNegative = data.net < -0.01

            return (
              <div
                key={member.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {(member.full_name || member.name || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {member.full_name || member.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isYou ? 'Your Account' : member.email || 'Roommate'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Paid:</span>
                    <span className="font-semibold text-slate-700">{formatBDT(data.paid)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Share:</span>
                    <span className="font-semibold text-slate-700">{formatBDT(data.share)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-bold">
                    <span className="text-slate-700">Net Standing:</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isNegative
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isPositive ? `+${formatBDT(data.net)}` : formatBDT(data.net)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 3: Settlement History ────────────────────────────────────── */}
      {settlements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-blue-600"></i>
            Recent Settlement Payments
          </h3>

          <div className="divide-y divide-slate-100">
            {settlements.map((st) => {
              const method = getMethodMeta(st.payment_method)
              return (
                <div key={st.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-check text-xs"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        <span className="font-bold">{st.payer_name || 'Roommate'}</span> paid{' '}
                        <span className="font-bold">{st.receiver_name || 'Roommate'}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-400">
                        <span>
                          {new Date(st.settled_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {st.notes && <span>• {st.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] flex items-center gap-1 ${method.color}`}
                    >
                      <i className={`fa-solid ${method.icon}`}></i>
                      {method.label}
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatBDT(st.amount)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
