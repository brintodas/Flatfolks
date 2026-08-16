/**
 * middleware/roommateContext.js
 *
 * Search-context middleware: attaches active groupId + aggregate group
 * preferences (total budget ceiling, required bed count) to every
 * property-search request that includes a `user_id` query param.
 *
 * Usage — mount BEFORE the listings GET handler:
 *   router.get('/', attachGroupContext, listingsHandler)
 *
 * Downstream handlers can read:
 *   req.groupContext = { groupId, memberCount, maxBudget, minBeds } | null
 */
const db = require('../config/db')

function attachGroupContext(req, res, next) {
  const userId = req.query.user_id || req.body?.user_id
  if (!userId) return next() // anonymous / landlord search — skip

  // Find the user's current group membership
  const memberSql = `
    SELECT rgm.group_id, rg.status
    FROM roommate_group_members rgm
    JOIN roommate_groups rg ON rg.id = rgm.group_id
    WHERE rgm.user_id = ?
      AND rg.status IN ('RECRUITING', 'ACTIVE')
    LIMIT 1
  `
  db.query(memberSql, [userId], (err, rows) => {
    if (err || rows.length === 0) {
      req.groupContext = null
      return next()
    }

    const groupId = rows[0].group_id

    // Aggregate all members' budget_max and bed preferences
    const aggSql = `
      SELECT
        COUNT(rgm.user_id) AS member_count,
        SUM(COALESCE(sp.budget_max, u.budget_max, 0)) AS total_budget,
        COUNT(CASE WHEN sp.room_type = 'single' THEN 1 END) AS single_pref_count
      FROM roommate_group_members rgm
      JOIN users u ON u.id = rgm.user_id
      LEFT JOIN student_profiles sp ON sp.user_id = rgm.user_id
      WHERE rgm.group_id = ?
    `
    db.query(aggSql, [groupId], (err2, agg) => {
      if (err2 || agg.length === 0) {
        req.groupContext = null
        return next()
      }

      const { member_count, total_budget } = agg[0]
      req.groupContext = {
        groupId,
        memberCount : parseInt(member_count),
        maxBudget   : parseInt(total_budget),  // sum of all members' budget_max
        minBeds     : parseInt(member_count),  // at minimum, need 1 bed per person
      }
      next()
    })
  })
}

module.exports = attachGroupContext
