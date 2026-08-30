/**
 * cron/rentReminderJob.js
 *
 * Daily cron job — runs every day at 08:00 AM server time.
 * For every active rent reminder it computes the upcoming
 * due date and inserts a notification at 7 days, 3 days, and
 * 1 day before the due date (each uniquely deduped by the
 * UNIQUE constraint on notifications.uq_notif_dedup).
 */
const cron = require('node-cron')
const db   = require('../config/db')

const WINDOWS = [
  { days: 7, type: 'rent_reminder_7d', label: '7 days' },
  { days: 3, type: 'rent_reminder_3d', label: '3 days' },
  { days: 1, type: 'rent_reminder_1d', label: 'tomorrow' },
]

/**
 * Given a due_day (1-31) and today's Date, compute the next
 * calendar due date (could be this month or next month).
 */
function nextDueDate(dueDay, today) {
  const year  = today.getFullYear()
  const month = today.getMonth() // 0-indexed

  // Clamp to last day of current month (e.g. due_day=31 in Feb → 28/29)
  const daysInThisMonth = new Date(year, month + 1, 0).getDate()
  const effectiveDay    = Math.min(dueDay, daysInThisMonth)
  const thisMonthDue    = new Date(year, month, effectiveDay)

  if (thisMonthDue >= today) return thisMonthDue

  // Already past this month's due date — use next month
  const daysInNextMonth = new Date(year, month + 2, 0).getDate()
  const nextMonthDay    = Math.min(dueDay, daysInNextMonth)
  return new Date(year, month + 1, nextMonthDay)
}

function toYMD(date) {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

async function runRentReminders() {
  console.log(`[RentReminderJob] Running at ${new Date().toISOString()}`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  db.query(
    `SELECT r.user_id, r.due_day, r.rent_amount, u.full_name
     FROM rent_reminders r
     JOIN users u ON u.id = r.user_id
     WHERE r.is_active = 1`,
    [],
    (err, reminders) => {
      if (err) {
        console.error('[RentReminderJob] DB error fetching reminders:', err)
        return
      }

      console.log(`[RentReminderJob] Processing ${reminders.length} active reminders`)

      reminders.forEach(reminder => {
        const dueDate    = nextDueDate(reminder.due_day, today)
        const dueDateStr = toYMD(dueDate)

        WINDOWS.forEach(({ days, type, label }) => {
          const triggerDate = new Date(dueDate)
          triggerDate.setDate(triggerDate.getDate() - days)
          triggerDate.setHours(0, 0, 0, 0)

          // Only fire if today IS the trigger date
          if (today.getTime() !== triggerDate.getTime()) return

          const amountStr = reminder.rent_amount
            ? ` (৳${Number(reminder.rent_amount).toLocaleString()})`
            : ''

          const title = `🏠 Rent Due in ${days === 1 ? '1 Day' : days + ' Days'}`
          const body  = `Hi ${reminder.full_name}, your rent${amountStr} is due on ${dueDate.toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })} — that's ${label}!`

          // INSERT IGNORE respects the UNIQUE constraint — safe to call daily
          db.query(
            `INSERT IGNORE INTO notifications (user_id, type, title, body, due_date)
             VALUES (?, ?, ?, ?, ?)`,
            [reminder.user_id, type, title, body, dueDateStr],
            (insertErr, result) => {
              if (insertErr) {
                console.error('[RentReminderJob] Insert error:', insertErr)
                return
              }
              if (result.affectedRows > 0) {
                console.log(`[RentReminderJob] ✓ Notification sent → user ${reminder.user_id} (${type}, due ${dueDateStr})`)
              }
            }
          )
        })
      })
    }
  )
}

// Schedule: every day at 08:00 AM
cron.schedule('0 8 * * *', runRentReminders, {
  timezone: 'Asia/Dhaka',
})

console.log('[RentReminderJob] Scheduled — fires daily at 08:00 Asia/Dhaka')

// Export so it can be triggered manually in tests
module.exports = { runRentReminders }
