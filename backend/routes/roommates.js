/**
 * routes/roommates.js
 *
 * Pre-lease Roommate Grouping API
 * Mounted at: /api/roommates
 *
 * POST /invite    — send a roommate invite
 * POST /respond   — accept or decline an invite
 * GET  /my-group  — fetch group details + pending invites
 * DELETE /leave   — leave or disband group
 */
const express = require('express')
const router  = express.Router()
const db      = require('../config/db')

// ─── helpers ────────────────────────────────────────────────────────────────

/** Run a SQL query wrapped in a Promise so we can use async/await. */
const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  )

/**
 * Mark all PENDING invites as EXPIRED if their expiry date has passed.
 *
 * Why the two-step approach:
 * The UNIQUE KEY on (group_id, invitee_id, status) means a single UPDATE that
 * changes PENDING → EXPIRED throws ER_DUP_ENTRY whenever a prior EXPIRED row
 * already exists for the same (group_id, invitee_id) pair (e.g. a group that
 * re-invited the same person after their first invite expired).
 *
 * Fix: delete any stale EXPIRED rows for the affected pairs first, then run
 * the UPDATE cleanly.
 */
async function expireOldInvites() {
  // Step 1 — remove old EXPIRED records for pairs that are about to be expired
  // again, so the UPDATE below never hits a duplicate-key violation.
  await query(
    `DELETE ri
     FROM roommate_invites ri
     JOIN (
       SELECT group_id, invitee_id
       FROM roommate_invites
       WHERE status = 'PENDING' AND expires_at < NOW()
     ) AS expiring
       ON  ri.group_id   = expiring.group_id
       AND ri.invitee_id = expiring.invitee_id
     WHERE ri.status = 'EXPIRED'`,
    []
  )
  // Step 2 — now safely mark the overdue PENDING invites as EXPIRED.
  await query(
    `UPDATE roommate_invites
     SET status = 'EXPIRED'
     WHERE status = 'PENDING' AND expires_at < NOW()`,
    []
  )
}

// ─── POST /api/roommates/invite ──────────────────────────────────────────────
/**
 * Send a roommate invite.
 * Body: { inviter_id, invitee_id, message? }
 *
 * Rules enforced:
 *  1. Inviter must be a student in a RECRUITING/ACTIVE group.
 *  2. Invitee must be a student with no current group (exclusivity).
 *  3. Group size + pending invites must be < 4 (strict 4-person cap).
 *  4. No duplicate PENDING invite to the same person.
 */
router.post('/invite', async (req, res) => {
  try {
    await expireOldInvites()

    const { inviter_id, invitee_id, message } = req.body
    if (!inviter_id || !invitee_id) {
      return res.status(400).json({ success: false, message: 'inviter_id and invitee_id are required.' })
    }
    if (inviter_id === invitee_id) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself.' })
    }

    // Verify invitee is a student
    const [invitee] = await query('SELECT id, role FROM users WHERE id = ?', [invitee_id])
    if (!invitee || invitee.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Invitee not found or not a student.' })
    }

    // Look up inviter's current group
    const memberRows = await query(
      `SELECT rgm.group_id, rg.status, rg.leader_id
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING','ACTIVE')`,
      [inviter_id]
    )

    let groupId

    if (memberRows.length === 0) {
      // Inviter has no group — auto-create one
      const result = await query(
        `INSERT INTO roommate_groups (leader_id, name, status) VALUES (?, 'My Group', 'RECRUITING')`,
        [inviter_id]
      )
      groupId = result.insertId
      await query(
        `INSERT INTO roommate_group_members (group_id, user_id) VALUES (?, ?)`,
        [groupId, inviter_id]
      )
    } else {
      groupId = memberRows[0].group_id
    }

    // Count existing members + pending invites to enforce ≤ 4 cap
    const [{ member_count }] = await query(
      `SELECT COUNT(*) AS member_count FROM roommate_group_members WHERE group_id = ?`,
      [groupId]
    )
    const [{ pending_count }] = await query(
      `SELECT COUNT(*) AS pending_count
       FROM roommate_invites
       WHERE group_id = ? AND status = 'PENDING'`,
      [groupId]
    )

    // Business Rule 1: block if group + pending would exceed 4
    if (parseInt(member_count) + parseInt(pending_count) >= 4) {
      return res.status(409).json({
        success: false,
        message: 'Group is full or has too many pending invites. Max 4 members.',
      })
    }

    // Business Rule 2: invitee must not be in another active group
    const inviteeMember = await query(
      `SELECT rgm.group_id
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING','ACTIVE')`,
      [invitee_id]
    )
    if (inviteeMember.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This student is already in an active group.',
      })
    }

    // No duplicate PENDING invite
    const dupCheck = await query(
      `SELECT id FROM roommate_invites
       WHERE group_id = ? AND invitee_id = ? AND status = 'PENDING'`,
      [groupId, invitee_id]
    )
    if (dupCheck.length > 0) {
      return res.status(409).json({ success: false, message: 'A pending invite already exists for this student.' })
    }

    // Insert invite with 7-day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await query(
      `INSERT INTO roommate_invites (group_id, inviter_id, invitee_id, message, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, inviter_id, invitee_id, message || null, expiresAt]
    )

    res.json({ success: true, message: 'Invite sent!', groupId })
  } catch (err) {
    console.error('Invite error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// ─── POST /api/roommates/respond ─────────────────────────────────────────────
/**
 * Accept or decline an invite.
 * Body: { invite_id, user_id, action: 'ACCEPTED' | 'DECLINED' }
 *
 * On ACCEPTED:
 *  - Add user to the group's members table.
 *  - Auto-decline all other PENDING invites for this user (exclusivity rule).
 *  - Update group status to ACTIVE if member count reaches 4.
 * On DECLINED:
 *  - Just mark the invite as DECLINED.
 */
router.post('/respond', async (req, res) => {
  try {
    await expireOldInvites()

    const { invite_id, user_id, action } = req.body
    if (!invite_id || !user_id || !['ACCEPTED', 'DECLINED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'invite_id, user_id, and action (ACCEPTED|DECLINED) are required.' })
    }

    // Fetch the invite and validate ownership
    const invites = await query(
      `SELECT * FROM roommate_invites WHERE id = ? AND invitee_id = ? AND status = 'PENDING'`,
      [invite_id, user_id]
    )
    if (invites.length === 0) {
      return res.status(404).json({ success: false, message: 'Invite not found or already responded.' })
    }

    const invite = invites[0]

    // Check it hasn't expired (belt-and-suspenders)
    if (new Date(invite.expires_at) < new Date()) {
      await query(`UPDATE roommate_invites SET status = 'EXPIRED' WHERE id = ?`, [invite_id])
      return res.status(410).json({ success: false, message: 'This invite has expired.' })
    }

    if (action === 'DECLINED') {
      await query(`UPDATE roommate_invites SET status = 'DECLINED' WHERE id = ?`, [invite_id])
      return res.json({ success: true, message: 'Invite declined.' })
    }

    // ── ACCEPTED path ────────────────────────────────────────────────────────

    // Verify group still has capacity (another member might have joined since invite was sent)
    const [{ member_count }] = await query(
      `SELECT COUNT(*) AS member_count FROM roommate_group_members WHERE group_id = ?`,
      [invite.group_id]
    )
    if (parseInt(member_count) >= 4) {
      await query(`UPDATE roommate_invites SET status = 'CANCELLED' WHERE id = ?`, [invite_id])
      return res.status(409).json({ success: false, message: 'Group is already full.' })
    }

    // Business Rule: user must not be in another group
    const existing = await query(
      `SELECT rgm.group_id
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING','ACTIVE')`,
      [user_id]
    )
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You are already in a group. Leave it first.' })
    }

    // Add member
    await query(
      `INSERT INTO roommate_group_members (group_id, user_id) VALUES (?, ?)`,
      [invite.group_id, user_id]
    )

    // Mark this invite ACCEPTED
    await query(`UPDATE roommate_invites SET status = 'ACCEPTED' WHERE id = ?`, [invite_id])

    // Auto-decline all other PENDING invites for this user (exclusivity constraint)
    await query(
      `UPDATE roommate_invites SET status = 'DECLINED'
       WHERE invitee_id = ? AND status = 'PENDING' AND id != ?`,
      [user_id, invite_id]
    )

    // Recount members; if now 4 → mark group ACTIVE
    const [{ new_count }] = await query(
      `SELECT COUNT(*) AS new_count FROM roommate_group_members WHERE group_id = ?`,
      [invite.group_id]
    )
    if (parseInt(new_count) >= 4) {
      await query(`UPDATE roommate_groups SET status = 'ACTIVE' WHERE id = ?`, [invite.group_id])
    }

    res.json({ success: true, message: 'You have joined the group!', groupId: invite.group_id })
  } catch (err) {
    console.error('Respond error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// ─── GET /api/roommates/my-group ─────────────────────────────────────────────
/**
 * Fetch the caller's group details, members, and pending invites.
 * Query param: ?user_id=<id>
 */
router.get('/my-group', async (req, res) => {
  try {
    await expireOldInvites()

    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required.' })

    // Find the user's active group
    const membership = await query(
      `SELECT rgm.group_id
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING','ACTIVE')`,
      [user_id]
    )

    if (membership.length === 0) {
      // No group — return pending received invites so they can accept them
      const received = await query(
        `SELECT
           ri.id, ri.group_id, ri.message, ri.expires_at, ri.created_at,
           u.full_name AS inviter_name, u.department AS inviter_dept,
           rg.name AS group_name,
           (SELECT COUNT(*) FROM roommate_group_members WHERE group_id = ri.group_id) AS member_count
         FROM roommate_invites ri
         JOIN users u ON u.id = ri.inviter_id
         JOIN roommate_groups rg ON rg.id = ri.group_id
         WHERE ri.invitee_id = ? AND ri.status = 'PENDING'
         ORDER BY ri.created_at DESC`,
        [user_id]
      )
      return res.json({ success: true, group: null, receivedInvites: received })
    }

    const groupId = membership[0].group_id

    // Group metadata
    const [group] = await query(
      `SELECT rg.*, u.full_name AS leader_name
       FROM roommate_groups rg
       JOIN users u ON u.id = rg.leader_id
       WHERE rg.id = ?`,
      [groupId]
    )

    // All members with their profiles
    const members = await query(
      `SELECT
         u.id AS user_id, u.full_name, u.department, u.semester, u.gender,
         sp.profile_photo, sp.budget_max, sp.preferred_district, sp.preferred_area,
         sp.room_type, sp.personality_tags, sp.quiz_completed,
         rgm.joined_at
       FROM roommate_group_members rgm
       JOIN users u ON u.id = rgm.user_id
       LEFT JOIN student_profiles sp ON sp.user_id = rgm.user_id
       WHERE rgm.group_id = ?
       ORDER BY rgm.joined_at ASC`,
      [groupId]
    )

    // Outgoing PENDING invites sent from this group
    const pendingInvites = await query(
      `SELECT ri.id, ri.invitee_id, ri.message, ri.expires_at, ri.created_at,
              u.full_name AS invitee_name, u.department AS invitee_dept
       FROM roommate_invites ri
       JOIN users u ON u.id = ri.invitee_id
       WHERE ri.group_id = ? AND ri.status = 'PENDING'
       ORDER BY ri.created_at DESC`,
      [groupId]
    )

    // Incoming invites for this user (from other groups, if any)
    const receivedInvites = await query(
      `SELECT
         ri.id, ri.group_id, ri.message, ri.expires_at, ri.created_at,
         u.full_name AS inviter_name, rg.name AS group_name,
         (SELECT COUNT(*) FROM roommate_group_members WHERE group_id = ri.group_id) AS member_count
       FROM roommate_invites ri
       JOIN users u ON u.id = ri.inviter_id
       JOIN roommate_groups rg ON rg.id = ri.group_id
       WHERE ri.invitee_id = ? AND ri.status = 'PENDING'`,
      [user_id]
    )

    res.json({
      success: true,
      group: { ...group, members },
      pendingInvites,
      receivedInvites,
    })
  } catch (err) {
    console.error('my-group error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// ─── DELETE /api/roommates/leave ─────────────────────────────────────────────
/**
 * Leave a group or disband it.
 * Body: { user_id }
 *
 * Rules:
 *  - If user is leader AND members drop to 0 after leaving → disband group.
 *  - If user is leader but other members remain → transfer leadership to oldest member.
 *  - If non-leader leaves AND remaining members < 2 → set group status to 'RECRUITING'.
 *  - Cancel all outgoing PENDING invites for this group when leader disbands.
 */
router.delete('/leave', async (req, res) => {
  try {
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required.' })

    // Find the group
    const membership = await query(
      `SELECT rgm.group_id, rg.leader_id, rg.status
       FROM roommate_group_members rgm
       JOIN roommate_groups rg ON rg.id = rgm.group_id
       WHERE rgm.user_id = ? AND rg.status IN ('RECRUITING','ACTIVE')`,
      [user_id]
    )
    if (membership.length === 0) {
      return res.status(404).json({ success: false, message: 'You are not in any active group.' })
    }

    const { group_id: groupId, leader_id } = membership[0]
    const isLeader = parseInt(leader_id) === parseInt(user_id)

    // Remove the member
    await query(`DELETE FROM roommate_group_members WHERE group_id = ? AND user_id = ?`, [groupId, user_id])

    // Recount remaining members
    const remaining = await query(
      `SELECT user_id FROM roommate_group_members WHERE group_id = ? ORDER BY joined_at ASC`,
      [groupId]
    )

    if (remaining.length === 0) {
      // No members left — disband
      await query(`UPDATE roommate_groups SET status = 'DISBANDED' WHERE id = ?`, [groupId])
      // Cancel all pending invites for this group
      await query(
        `UPDATE roommate_invites SET status = 'CANCELLED' WHERE group_id = ? AND status = 'PENDING'`,
        [groupId]
      )
      return res.json({ success: true, message: 'Group disbanded.' })
    }

    if (isLeader) {
      // Transfer leadership to the oldest-joined remaining member
      const newLeaderId = remaining[0].user_id
      await query(`UPDATE roommate_groups SET leader_id = ? WHERE id = ?`, [newLeaderId, groupId])
    }

    // Revert to RECRUITING whenever the group drops below 4 members.
    // ACTIVE means "full" (4/4); any departure opens the group back up.
    if (remaining.length < 4) {
      await query(`UPDATE roommate_groups SET status = 'RECRUITING' WHERE id = ?`, [groupId])
    }

    res.json({ success: true, message: 'You have left the group.' })
  } catch (err) {
    console.error('Leave error:', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

module.exports = router
