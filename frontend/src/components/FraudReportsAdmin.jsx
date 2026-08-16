import { useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8000'

function FraudReportsAdmin() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState({})
  const [updatingId, setUpdatingId] = useState(null)

  let currentUser = null

  try {
    currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  } catch {
    currentUser = null
  }

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/api/reports/admin/all`
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Could not load fraud reports.'
        )
      }

      setReports(data.reports || [])

      const initialNotes = {}

      ;(data.reports || []).forEach(report => {
        initialNotes[report.id] = report.admin_note || ''
      })

      setNotes(initialNotes)
    } catch (err) {
      setError(err.message || 'Could not load fraud reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const updateReport = async (reportId, status) => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Admin account is required.')
      return
    }

    if (
      status === 'verified_scam' &&
      !notes[reportId]?.trim()
    ) {
      setError(
        'Please add an admin verification note before verifying a scam.'
      )
      return
    }

    setUpdatingId(reportId)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/api/reports/admin/${reportId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status,
            admin_note: notes[reportId]?.trim() || '',
            reviewed_by: currentUser.id
          })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Could not update report.'
        )
      }

      await loadReports()
    } catch (err) {
      setError(err.message || 'Could not update report.')
    } finally {
      setUpdatingId(null)
    }
  }

  const statusStyle = status => {
    if (status === 'verified_scam') {
      return 'bg-red-500/15 text-red-300 border-red-500/20'
    }

    if (status === 'rejected') {
      return 'bg-slate-500/15 text-slate-300 border-slate-500/20'
    }

    if (status === 'under_review') {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/20'
    }

    return 'bg-blue-500/15 text-blue-300 border-blue-500/20'
  }

  const riskStyle = level => {
    if (level === 'high') return 'text-red-400'
    if (level === 'medium') return 'text-amber-400'
    return 'text-green-400'
  }

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl py-16 text-center text-slate-400">
        Loading fraud reports...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            Fraud Reports
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Review student reports, uploaded evidence and
            automated fraud-risk indicators.
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
          {reports.length} report{reports.length === 1 ? '' : 's'}
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl py-16 text-center">
          <i className="fa-solid fa-shield-halved text-3xl text-slate-600 mb-3"></i>

          <p className="text-slate-300 font-medium">
            No fraud reports submitted
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Student reports will appear here for review.
          </p>
        </div>
      ) : (
        reports.map(report => (
          <div
            key={report.id}
            className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-700">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-flex border px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(
                        report.status
                      )}`}
                    >
                      {report.status
                        .replaceAll('_', ' ')
                        .toUpperCase()}
                    </span>

                    <span
                      className={`text-xs font-bold uppercase ${riskStyle(
                        report.risk_level
                      )}`}
                    >
                      {report.risk_level} risk
                    </span>

                    <span className="text-xs text-slate-500">
                      Score {report.risk_score}/100
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white">
                    {report.listing_title}
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    {report.location || 'Location unavailable'}
                  </p>
                </div>

                <div className="text-left lg:text-right text-xs text-slate-400">
                  <p>Report #{report.id}</p>

                  <p className="mt-1">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Report details
                  </p>

                  <div className="bg-slate-900/60 rounded-xl p-4 space-y-2 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-500">
                        Category:
                      </span>{' '}
                      <span className="capitalize">
                        {report.category.replaceAll('_', ' ')}
                      </span>
                    </p>

                    <p className="text-slate-300">
                      <span className="text-slate-500">
                        Landlord:
                      </span>{' '}
                      {report.landlord_name || 'Not provided'}
                    </p>

                    <p className="text-slate-300">
                      <span className="text-slate-500">
                        Student:
                      </span>{' '}
                      {report.reporter_name}
                    </p>

                    <p className="text-slate-300">
                      <span className="text-slate-500">
                        Student email:
                      </span>{' '}
                      {report.reporter_email}
                    </p>

                    <p className="text-slate-300">
                      <span className="text-slate-500">
                        Property visited:
                      </span>{' '}
                      {Number(report.visit_confirmed) === 1
                        ? 'Yes'
                        : 'No'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Student statement
                  </p>

                  <div className="bg-slate-900/60 rounded-xl p-4">
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Evidence
                  </p>

                  {report.evidence?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {report.evidence.map(item => (
                        <a
                          key={item.id}
                          href={`${API_BASE}${item.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-700 border border-slate-700 rounded-xl p-3 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                            <i
                              className={
                                item.evidence_type === 'video'
                                  ? 'fa-solid fa-circle-play text-red-400'
                                  : 'fa-solid fa-image text-blue-400'
                              }
                            ></i>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">
                              {item.evidence_type === 'video'
                                ? 'Video proof'
                                : 'Photo proof'}
                            </p>

                            <p className="text-xs text-slate-500 truncate">
                              {item.original_name}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No photo or video evidence uploaded.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-user-shield text-blue-400"></i>

                    <h4 className="font-semibold text-white">
                      Admin Verification
                    </h4>
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-xs text-slate-500 mb-1">
                      Automated fraud detection
                    </p>

                    <p
                      className={`font-semibold capitalize ${riskStyle(
                        report.risk_level
                      )}`}
                    >
                      {report.risk_level} risk,{' '}
                      {report.risk_score}/100
                    </p>

                    <p className="text-xs text-slate-500 mt-2">
                      Risk is an automated indicator only. Admin
                      evidence review is required before a report
                      becomes publicly verified.
                    </p>
                  </div>

                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Admin review note
                  </label>

                  <textarea
                    value={notes[report.id] || ''}
                    onChange={event =>
                      setNotes(prev => ({
                        ...prev,
                        [report.id]: event.target.value
                      }))
                    }
                    rows={5}
                    placeholder="Explain what was verified or why the report was rejected..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-y"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <button
                      type="button"
                      disabled={updatingId === report.id}
                      onClick={() =>
                        updateReport(report.id, 'under_review')
                      }
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Under Review
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === report.id}
                      onClick={() =>
                        updateReport(report.id, 'verified_scam')
                      }
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Verify Scam
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === report.id}
                      onClick={() =>
                        updateReport(report.id, 'rejected')
                      }
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>

                  {report.reviewed_at && (
                    <p className="text-xs text-slate-500 mt-4">
                      Last reviewed:{' '}
                      {new Date(
                        report.reviewed_at
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default FraudReportsAdmin