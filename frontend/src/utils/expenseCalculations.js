/**
 * utils/expenseCalculations.js
 *
 * Pure, testable calculation helpers for Shared Bills & Splitwise-style expense tracking:
 * - Split calculations (Equal, Exact, Percentage)
 * - Net balance computation
 * - Debt simplification (greedy algorithm to minimize transactions)
 * - Currency formatting
 */

export const CATEGORIES = [
  { id: 'rent', label: 'Rent & Sublet', icon: 'fa-house-user', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'electricity', label: 'Electricity / DESCO', icon: 'fa-bolt', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'wifi', label: 'Wi-Fi & Internet', icon: 'fa-wifi', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'groceries', label: 'Groceries & Bazaar', icon: 'fa-basket-shopping', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'water_gas', label: 'Water & Gas', icon: 'fa-fire-flame-curved', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'maid', label: 'Maid / Cook / Cleaning', icon: 'fa-broom', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'maintenance', label: 'Maintenance & Repairs', icon: 'fa-wrench', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'other', label: 'Other Shared Costs', icon: 'fa-receipt', color: 'bg-slate-50 text-slate-700 border-slate-200' },
]

export const SPLIT_TYPES = {
  EQUAL: 'EQUAL',
  EXACT: 'EXACT',
  PERCENTAGE: 'PERCENTAGE',
}

export const PAYMENT_METHODS = [
  { id: 'bkash', label: 'bKash', icon: 'fa-mobile-screen-button', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'nagad', label: 'Nagad', icon: 'fa-money-bill-transfer', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'bank', label: 'Bank Transfer', icon: 'fa-building-columns', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'cash', label: 'Cash Payment', icon: 'fa-money-bill-wave', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'other', label: 'Other', icon: 'fa-credit-card', color: 'text-slate-600 bg-slate-50 border-slate-200' },
]

/**
 * Formats a numeric value into Bangladeshi Taka (৳) string.
 * @param {number|string} amount
 * @param {boolean} forceDecimals
 * @returns {string} e.g. "৳1,500" or "৳1,500.50"
 */
export function formatBDT(amount, forceDecimals = false) {
  const num = Number(amount) || 0
  const hasDecimals = forceDecimals || Math.abs(num % 1) > 0.001
  return `৳${num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Calculates individual split amounts according to split type.
 *
 * @param {number} totalAmount - Total expense amount
 * @param {string} splitType - 'EQUAL' | 'EXACT' | 'PERCENTAGE'
 * @param {Array<{id: number, name: string}>} participants - List of selected participant objects
 * @param {Object} customValues - Map of { [userId]: number } for EXACT or PERCENTAGE
 * @returns {{ splits: Array<{ userId: number, amount: number, percentage?: number }>, isValid: boolean, error: string | null }}
 */
export function calculateSplits(totalAmount, splitType, participants, customValues = {}) {
  const total = Number(totalAmount)
  if (!total || total <= 0) {
    return { splits: [], isValid: false, error: 'Total amount must be greater than zero.' }
  }
  if (!participants || participants.length === 0) {
    return { splits: [], isValid: false, error: 'At least one participant must be selected.' }
  }

  const count = participants.length

  if (splitType === SPLIT_TYPES.EQUAL) {
    // Equal split with precise 2-decimal rounding distribution
    const baseShare = Math.floor((total / count) * 100) / 100
    let remainderCents = Math.round((total - baseShare * count) * 100)

    const splits = participants.map((p) => {
      let share = baseShare
      if (remainderCents > 0) {
        share = Math.round((share + 0.01) * 100) / 100
        remainderCents -= 1
      }
      return {
        userId: p.id,
        amount: share,
        percentage: Math.round((share / total) * 10000) / 100,
      }
    })

    return { splits, isValid: true, error: null }
  }

  if (splitType === SPLIT_TYPES.EXACT) {
    let sum = 0
    const splits = participants.map((p) => {
      const val = Number(customValues[p.id]) || 0
      sum += val
      return {
        userId: p.id,
        amount: Math.round(val * 100) / 100,
        percentage: total > 0 ? Math.round((val / total) * 10000) / 100 : 0,
      }
    })

    const diff = Math.round((total - sum) * 100) / 100
    if (Math.abs(diff) > 0.05) {
      return {
        splits,
        isValid: false,
        error: diff > 0
          ? `Exact shares sum to ৳${sum.toFixed(2)}, which is ৳${diff.toFixed(2)} less than total (৳${total.toFixed(2)}).`
          : `Exact shares sum to ৳${sum.toFixed(2)}, which exceeds total by ৳${Math.abs(diff).toFixed(2)}.`,
      }
    }

    return { splits, isValid: true, error: null }
  }

  if (splitType === SPLIT_TYPES.PERCENTAGE) {
    let pctSum = 0
    participants.forEach((p) => {
      pctSum += Number(customValues[p.id]) || 0
    })

    const pctDiff = Math.round((100 - pctSum) * 100) / 100
    if (Math.abs(pctDiff) > 0.01) {
      return {
        splits: [],
        isValid: false,
        error: `Percentages must total 100%. Currently: ${pctSum.toFixed(1)}% (${pctDiff > 0 ? `${pctDiff.toFixed(1)}% remaining` : `${Math.abs(pctDiff).toFixed(1)}% over`}).`,
      }
    }

    let calculatedSum = 0
    const splits = participants.map((p, idx) => {
      const pct = Number(customValues[p.id]) || 0
      let share = Math.round(((total * pct) / 100) * 100) / 100
      if (idx === participants.length - 1) {
        // Adjust any tiny rounding cents on the last participant
        share = Math.round((total - calculatedSum) * 100) / 100
      } else {
        calculatedSum += share
      }
      return {
        userId: p.id,
        amount: share,
        percentage: pct,
      }
    })

    return { splits, isValid: true, error: null }
  }

  return { splits: [], isValid: false, error: 'Unknown split type.' }
}

/**
 * Computes net balances for all members in a group.
 * Positive = member is owed money (credit).
 * Negative = member owes money (debt).
 *
 * @param {Array<{id: number, name: string}>} members
 * @param {Array<Object>} expenses
 * @param {Array<Object>} settlements
 * @returns {Record<number, { user: Object, net: number, paid: number, share: number, settledPaid: number, settledReceived: number }>}
 */
export function computeNetBalances(members = [], expenses = [], settlements = []) {
  const map = {}

  members.forEach((m) => {
    map[m.id] = {
      user: m,
      net: 0,
      paid: 0,
      share: 0,
      settledPaid: 0,
      settledReceived: 0,
    }
  })

  // Aggregate expenses and splits
  expenses.forEach((exp) => {
    const payerId = exp.payer_id
    const amount = Number(exp.amount) || 0

    if (map[payerId]) {
      map[payerId].paid += amount
      map[payerId].net += amount
    }

    if (Array.isArray(exp.splits)) {
      exp.splits.forEach((split) => {
        const userId = split.user_id || split.userId
        const owed = Number(split.amount_owed || split.amount) || 0
        if (map[userId]) {
          map[userId].share += owed
          map[userId].net -= owed
        }
      })
    }
  })

  // Aggregate settlements
  settlements.forEach((st) => {
    const payerId = st.payer_id
    const receiverId = st.receiver_id
    const amount = Number(st.amount) || 0

    if (map[payerId]) {
      map[payerId].settledPaid += amount
      map[payerId].net += amount
    }
    if (map[receiverId]) {
      map[receiverId].settledReceived += amount
      map[receiverId].net -= amount
    }
  })

  // Clean rounding jitter
  Object.keys(map).forEach((k) => {
    map[k].net = Math.round(map[k].net * 100) / 100
    map[k].paid = Math.round(map[k].paid * 100) / 100
    map[k].share = Math.round(map[k].share * 100) / 100
  })

  return map
}

/**
 * Simplifies group debts to minimize the total number of transactions.
 * Greedy algorithm: matches largest debtor with largest creditor.
 *
 * @param {Record<number, { user: Object, net: number }>} netBalances
 * @returns {Array<{ fromUser: Object, toUser: Object, amount: number }>}
 */
export function simplifyDebts(netBalances = {}) {
  const debtors = []
  const creditors = []

  Object.values(netBalances).forEach((item) => {
    const net = item.net
    if (net < -0.01) {
      debtors.push({ user: item.user, amount: Math.abs(net) })
    } else if (net > 0.01) {
      creditors.push({ user: item.user, amount: net })
    }
  })

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const transactions = []
  let dIdx = 0
  let cIdx = 0

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx]
    const creditor = creditors[cIdx]

    const settleAmount = Math.min(debtor.amount, creditor.amount)
    const roundedAmount = Math.round(settleAmount * 100) / 100

    if (roundedAmount > 0) {
      transactions.push({
        fromUser: debtor.user,
        toUser: creditor.user,
        amount: roundedAmount,
      })
    }

    debtor.amount -= settleAmount
    creditor.amount -= settleAmount

    if (debtor.amount <= 0.01) dIdx++
    if (creditor.amount <= 0.01) cIdx++
  }

  return transactions
}
