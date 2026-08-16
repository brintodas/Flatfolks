import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:8000/api/roommates'

// ── sub-components ─────────────────────────────────────────────────────────

/** Avatar circle with initials fallback */
function Avatar({ photo, name, size = 40 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return photo ? (
    <img
      src={`http://localhost:8000${photo}`}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

/** Pill badge for invite status */
function StatusBadge({ status }) {
  const map = {
    PENDING:   { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    ACCEPTED:  { bg: '#d1fae5', color: '#065f46', label: 'Accepted' },
    DECLINED:  { bg: '#fee2e2', color: '#991b1b', label: 'Declined' },
    CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
    EXPIRED:   { bg: '#f1f5f9', color: '#94a3b8', label: 'Expired' },
  }
  const s = map[status] || map.PENDING
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    }}>
      {s.label}
    </span>
  )
}

/** How many days until expiry */
function ExpiryCountdown({ expiresAt }) {
  const days = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 86400000))
  return (
    <span style={{ fontSize: 11, color: days <= 1 ? '#ef4444' : '#94a3b8' }}>
      {days === 0 ? 'Expires today' : `Expires in ${days}d`}
    </span>
  )
}

/** Group capacity bar */
function CapacityBar({ count, max = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 20, height: 6, borderRadius: 99,
          background: i < count ? '#2563eb' : '#e2e8f0',
          transition: 'background 0.3s',
        }} />
      ))}
      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{count}/{max} members</span>
    </div>
  )
}

// ── main component ──────────────────────────────────────────────────────────

/**
 * RoommateGroupPanel
 *
 * Shows:
 *  - Current group info (members, capacity, pending outgoing invites)
 *  - Received pending invites (if not in a group)
 *  - Invite-by-user-id form
 *  - Leave / disband button
 *
 * Props:
 *  - userId   {number}  — logged-in student's id
 *  - userName {string}  — for display
 */
export default function RoommateGroupPanel({ userId, userName }) {
  const [data, setData]         = useState(null)   // { group, pendingInvites, receivedInvites }
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Invite form state
  const [inviteeId, setInviteeId] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [sending, setSending]     = useState(false)
  const [formMsg, setFormMsg]     = useState(null)

  // ── data fetch ────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API}/my-group?user_id=${userId}`)
      const j = await r.json()
      if (!j.success) throw new Error(j.message)
      setData(j)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  // ── invite send ───────────────────────────────────────────────────────────
  async function sendInvite(e) {
    e.preventDefault()
    if (!inviteeId.trim()) return
    setSending(true)
    setFormMsg(null)
    try {
      const r = await fetch(`${API}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviter_id: userId, invitee_id: Number(inviteeId), message: inviteMsg }),
      })
      const j = await r.json()
      setFormMsg({ ok: j.success, text: j.message })
      if (j.success) { setInviteeId(''); setInviteMsg(''); refresh() }
    } catch {
      setFormMsg({ ok: false, text: 'Network error. Try again.' })
    } finally {
      setSending(false)
    }
  }

  // ── respond to invite ─────────────────────────────────────────────────────
  async function respond(inviteId, action) {
    try {
      const r = await fetch(`${API}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId, user_id: userId, action }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.message); return }
      refresh()
    } catch {
      alert('Network error. Try again.')
    }
  }

  // ── leave / disband ───────────────────────────────────────────────────────
  async function leaveGroup() {
    if (!window.confirm('Are you sure you want to leave this group?')) return
    try {
      const r = await fetch(`${API}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.message); return }
      refresh()
    } catch {
      alert('Network error. Try again.')
    }
  }

  // ── render states ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 22, marginBottom: 8 }} /><br />
      Loading group info…
    </div>
  )

  if (error) return (
    <div style={{ padding: 24, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
      {error}
    </div>
  )

  const { group, pendingInvites = [], receivedInvites = [] } = data || {}
  const isLeader = group && parseInt(group.leader_id) === parseInt(userId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Received invites (shown when user has no group OR always if pending) ── */}
      {receivedInvites.length > 0 && (
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>
            <i className="fa-solid fa-envelope-open-text" style={{ color: '#f59e0b', marginRight: 8 }} />
            Incoming Invites
            <span style={badgeStyle(receivedInvites.length)}>{receivedInvites.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {receivedInvites.map(inv => (
              <div key={inv.id} style={inviteCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                      <i className="fa-solid fa-user-group" style={{ color: '#2563eb', marginRight: 6 }} />
                      {inv.group_name || 'A Group'}
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Invited by <strong>{inv.inviter_name}</strong> · {inv.member_count}/4 members
                    </p>
                    {inv.message && (
                      <p style={{ fontSize: 13, color: '#475569', marginTop: 6, fontStyle: 'italic' }}>
                        "{inv.message}"
                      </p>
                    )}
                  </div>
                  <ExpiryCountdown expiresAt={inv.expires_at} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    id={`accept-invite-${inv.id}`}
                    onClick={() => respond(inv.id, 'ACCEPTED')}
                    style={btnPrimary}
                  >
                    <i className="fa-solid fa-check" style={{ marginRight: 4 }} /> Accept
                  </button>
                  <button
                    id={`decline-invite-${inv.id}`}
                    onClick={() => respond(inv.id, 'DECLINED')}
                    style={btnGhost}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── No group state ── */}
      {!group && (
        <section style={{ ...sectionStyle, textAlign: 'center', padding: '40px 24px' }}>
          <i className="fa-solid fa-people-group" style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 6 }}>You're not in a group yet</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 320, margin: '0 auto' }}>
            Send an invite to a fellow student to auto-create a group and start searching together.
          </p>
        </section>
      )}

      {/* ── Group card ── */}
      {group && (
        <section style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ ...sectionTitle, marginBottom: 4 }}>
                <i className="fa-solid fa-house-chimney-user" style={{ color: '#2563eb', marginRight: 8 }} />
                {group.name}
              </h3>
              <CapacityBar count={group.members?.length || 0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: group.status === 'ACTIVE' ? '#d1fae5' : '#dbeafe',
                color: group.status === 'ACTIVE' ? '#065f46' : '#1d4ed8',
              }}>
                {group.status === 'ACTIVE' ? '● Full' : '● Recruiting'}
              </span>
              <button
                id="leave-group-btn"
                onClick={leaveGroup}
                style={{ ...btnGhost, fontSize: 12 }}
              >
                <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 4 }} />
                {isLeader && group.members?.length === 1 ? 'Disband' : 'Leave'}
              </button>
            </div>
          </div>

          {/* Members list */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(group.members || []).map(m => (
              <div key={m.user_id} style={memberRowStyle}>
                <Avatar photo={m.profile_photo} name={m.full_name} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{m.full_name}</span>
                    {parseInt(group.leader_id) === parseInt(m.user_id) && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 7px', borderRadius: 99 }}>
                        Leader
                      </span>
                    )}
                    {parseInt(m.user_id) === parseInt(userId) && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>(you)</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                    {m.department || '—'} · {m.semester || '—'}
                  </p>
                  {m.budget_max && (
                    <p style={{ fontSize: 11, color: '#2563eb', marginTop: 2 }}>
                      Budget up to ৳{m.budget_max.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending outgoing invites */}
          {pendingInvites.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Awaiting Response
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingInvites.map(inv => (
                  <div key={inv.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#f8fafc', borderRadius: 10,
                    border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 6,
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{inv.invitee_name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{inv.invitee_dept}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ExpiryCountdown expiresAt={inv.expires_at} />
                      <StatusBadge status="PENDING" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Send invite form ── */}
      {/* Only shown if group has capacity, or user has no group (to bootstrap one) */}
      {(!group || (group.members?.length || 0) + pendingInvites.length < 4) && (
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>
            <i className="fa-solid fa-user-plus" style={{ color: '#2563eb', marginRight: 8 }} />
            Invite a Student
          </h3>
          <form onSubmit={sendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <div>
              <label style={labelStyle} htmlFor="invitee-id-input">Student ID</label>
              <input
                id="invitee-id-input"
                type="number"
                placeholder="Enter their user ID"
                value={inviteeId}
                onChange={e => setInviteeId(e.target.value)}
                required
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Ask your potential roommate for their Flatfolks user ID from their profile.
              </p>
            </div>
            <div>
              <label style={labelStyle} htmlFor="invite-message-input">Personal note (optional)</label>
              <input
                id="invite-message-input"
                type="text"
                placeholder="e.g. Hey! Want to search for a flat together?"
                maxLength={240}
                value={inviteMsg}
                onChange={e => setInviteMsg(e.target.value)}
                style={inputStyle}
              />
            </div>
            {formMsg && (
              <p style={{ fontSize: 13, color: formMsg.ok ? '#059669' : '#ef4444', fontWeight: 500 }}>
                <i className={`fa-solid ${formMsg.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 5 }} />
                {formMsg.text}
              </p>
            )}
            <button
              id="send-invite-btn"
              type="submit"
              disabled={sending}
              style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: sending ? 0.7 : 1 }}
            >
              {sending
                ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Sending…</>
                : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />Send Invite</>
              }
            </button>
          </form>
        </section>
      )}
    </div>
  )
}

// ── style constants ──────────────────────────────────────────────────────────

const sectionStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: '20px 22px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

const sectionTitle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
}

const inviteCardStyle = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '14px 16px',
  transition: 'box-shadow 0.2s',
}

const memberRowStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #f1f5f9',
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 14,
  color: '#1e293b',
  outline: 'none',
  transition: 'border-color 0.2s',
  background: '#f8fafc',
}

const btnPrimary = {
  padding: '9px 18px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.2s',
}

const btnGhost = {
  padding: '8px 16px',
  background: 'transparent',
  color: '#64748b',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s',
}

const badgeStyle = (count) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 20,
  height: 20,
  borderRadius: 99,
  background: '#ef4444',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  marginLeft: 8,
  padding: '0 6px',
})
