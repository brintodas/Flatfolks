/**
 * routes/bills.js
 *
 * Shared Bills & Roommate Expense Tracker API
 * Mounted at: /api/bills
 *
 * GET    /group/:groupId   — Fetch all expenses, splits, settlements, and group members
 * GET    /summary/:userId  — Quick pending balance overview for a specific user
 * POST   /                 — Create a new expense and split shares
 * PUT    /:id              — Update an expense
 * DELETE /:id              — Delete an expense and its splits
 * POST   /settle           — Record a settlement transaction
 */
const express = require('express')
const router  = express.Router()
const db      = require('../config/db')

// ─── Promise Wrapper for DB queries ──────────────────────────────────────────
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

// ─── GET /api/bills/group/:groupId ───────────────────────────────────────────
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params
  if (!groupId) {
    return res.status(400).json({ success: false, message: 'groupId is required.' })
  }

  try {
    // 1. Fetch group members
    const membersSql = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone, 
        sp.profile_photo,
        rgm.joined_at,
        (rg.leader_id = u.id) AS is_leader
      FROM roommate_group_members rgm
      JOIN users u ON u.id = rgm.user_id
      JOIN roommate_groups rg ON rg.id = rgm.group_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE rgm.group_id = ?
    `
    const members = await query(membersSql, [groupId])

    // 2. Fetch expenses
    const expensesSql = `
      SELECT 
        e.id, 
        e.group_id, 
        e.payer_id, 
        e.title, 
        CAST(e.amount AS DECIMAL(10,2)) AS amount, 
        e.category, 
        e.split_type, 
        e.notes, 
        e.receipt_url, 
        e.expense_date, 
        e.created_at,
        COALESCE(u.full_name, 'Nobody yet (Pending Bill)') AS payer_name,
        u.email AS payer_email,
        sp.profile_photo AS payer_photo
      FROM expenses e
      LEFT JOIN users u ON u.id = e.payer_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE e.group_id = ?
      ORDER BY e.expense_date DESC, e.created_at DESC
    `
    const expenses = await query(expensesSql, [groupId])

    // 3. Fetch splits for all group expenses
    const expenseIds = expenses.map((e) => e.id)
    let splits = []
    if (expenseIds.length > 0) {
      const splitsSql = `
        SELECT 
          es.id,
          es.expense_id,
          es.user_id,
          CAST(es.amount_owed AS DECIMAL(10,2)) AS amount_owed,
          es.percentage,
          es.is_settled,
          u.full_name AS user_name,
          sp.profile_photo AS user_photo
        FROM expense_splits es
        JOIN users u ON u.id = es.user_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE es.expense_id IN (?)
      `
      splits = await query(splitsSql, [expenseIds])
    }

    // Attach splits to their parent expense
    const splitsByExpense = {}
    splits.forEach((s) => {
      if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = []
      splitsByExpense[s.expense_id].push(s)
    })

    const populatedExpenses = expenses.map((e) => ({
      ...e,
      splits: splitsByExpense[e.id] || [],
    }))

    // 4. Fetch settlements
    const settlementsSql = `
      SELECT 
        s.id,
        s.group_id,
        s.payer_id,
        s.receiver_id,
        CAST(s.amount AS DECIMAL(10,2)) AS amount,
        s.payment_method,
        s.notes,
        s.settled_at,
        p.full_name AS payer_name,
        r.full_name AS receiver_name,
        p_sp.profile_photo AS payer_photo,
        r_sp.profile_photo AS receiver_photo
      FROM settlements s
      JOIN users p ON p.id = s.payer_id
      JOIN users r ON r.id = s.receiver_id
      LEFT JOIN student_profiles p_sp ON p_sp.user_id = p.id
      LEFT JOIN student_profiles r_sp ON r_sp.user_id = r.id
      WHERE s.group_id = ?
      ORDER BY s.settled_at DESC
    `
    const settlements = await query(settlementsSql, [groupId])

    // 4. Fetch group details
    const groupRows = await query('SELECT id, name, status FROM roommate_groups WHERE id = ?', [groupId])
    const groupName = groupRows[0]?.name || 'My Roommate Group'

    res.json({
      success: true,
      data: {
        groupId: parseInt(groupId),
        groupName,
        members,
        expenses: populatedExpenses,
        settlements,
      },
    })
  } catch (err) {
    console.error('Error fetching group bills:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch bills for group.' })
  }
})

// ─── GET /api/bills/summary/:userId ──────────────────────────────────────────
router.get('/summary/:userId', async (req, res) => {
  const { userId } = req.params
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required.' })
  }

  try {
    // Find active group for user
    const groupRows = await query(
      `SELECT rgm.group_id, rg.name AS group_name
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING', 'ACTIVE')
       LIMIT 1`,
      [userId]
    )

    if (groupRows.length === 0) {
      return res.json({
        success: true,
        hasGroup: false,
        data: {
          totalOwed: 0,
          totalOwedToYou: 0,
          netBalance: 0,
          pendingCount: 0,
        },
      })
    }

    const { group_id, group_name } = groupRows[0]

    // Fetch expenses and splits in this group
    const expenses = await query(
      `SELECT id, payer_id, amount FROM expenses WHERE group_id = ?`,
      [group_id]
    )
    const splits = await query(
      `SELECT es.expense_id, es.user_id, es.amount_owed
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = ?`,
      [group_id]
    )
    const settlements = await query(
      `SELECT payer_id, receiver_id, amount FROM settlements WHERE group_id = ?`,
      [group_id]
    )

    // Compute user net balance
    let userPaid = 0
    let userShare = 0
    let userSettledPaid = 0
    let userSettledReceived = 0

    expenses.forEach((e) => {
      if (String(e.payer_id) === String(userId)) userPaid += Number(e.amount)
    })

    splits.forEach((s) => {
      if (String(s.user_id) === String(userId)) userShare += Number(s.amount_owed)
    })

    settlements.forEach((st) => {
      if (String(st.payer_id) === String(userId)) userSettledPaid += Number(st.amount)
      if (String(st.receiver_id) === String(userId)) userSettledReceived += Number(st.amount)
    })

    const net = (userPaid + userSettledPaid) - (userShare + userSettledReceived)

    res.json({
      success: true,
      hasGroup: true,
      data: {
        groupId: group_id,
        groupName: group_name,
        totalPaid: userPaid,
        totalShare: userShare,
        netBalance: Math.round(net * 100) / 100,
        pendingCount: expenses.length,
      },
    })
  } catch (err) {
    console.error('Error fetching bill summary:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch bill summary.' })
  }
})

// ─── POST /api/bills ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    group_id,
    payer_id,
    title,
    amount,
    category,
    split_type = 'EQUAL',
    notes,
    receipt_url,
    expense_date = new Date().toISOString().slice(0, 10),
    splits = [],
  } = req.body

  if (!group_id || !title || !amount) {
    return res.status(400).json({
      success: false,
      message: 'group_id, title, and amount are required.',
    })
  }

  const finalPayerId = payer_id && payer_id !== 'unpaid' && payer_id !== 'nobody' ? Number(payer_id) : null

  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' })
  }

  if (!splits || splits.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one participant split is required.' })
  }

  // Validate split sum
  const splitSum = splits.reduce((acc, s) => acc + (parseFloat(s.amount_owed || s.amount) || 0), 0)
  if (Math.abs(splitSum - numAmount) > 0.1) {
    return res.status(400).json({
      success: false,
      message: `Split amounts (৳${splitSum.toFixed(2)}) must equal total expense amount (৳${numAmount.toFixed(2)}).`,
    })
  }

  try {
    // Insert Expense
    const expenseSql = `
      INSERT INTO expenses 
        (group_id, payer_id, title, amount, category, split_type, notes, receipt_url, expense_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await query(expenseSql, [
      group_id,
      finalPayerId,
      title,
      numAmount,
      category || 'other',
      split_type,
      notes || null,
      receipt_url || null,
      expense_date,
    ])

    const expenseId = result.insertId

    // Bulk Insert Splits
    const splitValues = splits.map((s) => [
      expenseId,
      s.user_id || s.userId,
      parseFloat(s.amount_owed || s.amount) || 0,
      s.percentage ? parseFloat(s.percentage) : null,
      0,
    ])

    await query(
      `INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, is_settled) VALUES ?`,
      [splitValues]
    )

    res.json({
      success: true,
      message: 'Expense added successfully.',
      expenseId,
    })
  } catch (err) {
    console.error('Error creating expense:', err)
    res.status(500).json({ success: false, message: 'Failed to create expense.' })
  }
})

// ─── PUT /api/bills/:id ──────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const {
    title,
    amount,
    category,
    split_type,
    notes,
    receipt_url,
    expense_date,
    payer_id,
    splits,
  } = req.body

  if (!id) return res.status(400).json({ success: false, message: 'Expense id is required.' })

  try {
    const [existing] = await query('SELECT id, group_id FROM expenses WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found.' })
    }

    const updates = []
    const params = []

    if (title !== undefined) { updates.push('title = ?'); params.push(title) }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(parseFloat(amount)) }
    if (category !== undefined) { updates.push('category = ?'); params.push(category) }
    if (split_type !== undefined) { updates.push('split_type = ?'); params.push(split_type) }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes) }
    if (receipt_url !== undefined) { updates.push('receipt_url = ?'); params.push(receipt_url) }
    if (expense_date !== undefined) { updates.push('expense_date = ?'); params.push(expense_date) }
    if (payer_id !== undefined) {
      const finalPayerId = payer_id && payer_id !== 'unpaid' && payer_id !== 'nobody' ? Number(payer_id) : null
      updates.push('payer_id = ?');
      params.push(finalPayerId)
    }

    if (updates.length > 0) {
      params.push(id)
      await query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    if (Array.isArray(splits) && splits.length > 0) {
      // Recreate splits
      await query('DELETE FROM expense_splits WHERE expense_id = ?', [id])
      const splitValues = splits.map((s) => [
        id,
        s.user_id || s.userId,
        parseFloat(s.amount_owed || s.amount) || 0,
        s.percentage ? parseFloat(s.percentage) : null,
        0,
      ])
      await query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, is_settled) VALUES ?`,
        [splitValues]
      )
    }

    res.json({ success: true, message: 'Expense updated successfully.' })
  } catch (err) {
    console.error('Error updating expense:', err)
    res.status(500).json({ success: false, message: 'Failed to update expense.' })
  }
})

// ─── DELETE /api/bills/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  if (!id) return res.status(400).json({ success: false, message: 'id is required.' })

  try {
    const result = await query('DELETE FROM expenses WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found.' })
    }
    res.json({ success: true, message: 'Expense deleted successfully.' })
  } catch (err) {
    console.error('Error deleting expense:', err)
    res.status(500).json({ success: false, message: 'Failed to delete expense.' })
  }
})

// ─── POST /api/bills/settle ──────────────────────────────────────────────────
router.post('/settle', async (req, res) => {
  const {
    group_id,
    payer_id,
    receiver_id,
    amount,
    payment_method = 'bkash',
    notes,
  } = req.body

  if (!group_id || !payer_id || !receiver_id || !amount) {
    return res.status(400).json({
      success: false,
      message: 'group_id, payer_id, receiver_id, and amount are required.',
    })
  }

  if (payer_id === receiver_id) {
    return res.status(400).json({ success: false, message: 'Payer and receiver cannot be the same person.' })
  }

  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Settlement amount must be greater than 0.' })
  }

  try {
    const sql = `
      INSERT INTO settlements 
        (group_id, payer_id, receiver_id, amount, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const result = await query(sql, [
      group_id,
      payer_id,
      receiver_id,
      numAmount,
      payment_method,
      notes || null,
    ])

    res.json({
      success: true,
      message: 'Settlement recorded successfully.',
      settlementId: result.insertId,
    })
  } catch (err) {
    console.error('Error recording settlement:', err)
    res.status(500).json({ success: false, message: 'Failed to record settlement.' })
  }
})

module.exports = router
