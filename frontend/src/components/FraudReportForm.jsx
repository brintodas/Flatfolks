import { useState } from 'react'

const API_BASE = 'http://localhost:8000'

function FraudReportForm({ listingId, onSubmitted }) {
  const [category, setCategory] = useState('scam')
  const [description, setDescription] = useState('')
  const [visitConfirmed, setVisitConfirmed] = useState(false)
  const [evidence, setEvidence] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [resultType, setResultType] = useState('')

  let currentUser = null

  try {
    currentUser = JSON.parse(localStorage.getItem('ff_user'))
  } catch {
    currentUser = null
  }

  const handleFiles = event => {
    const files = Array.from(event.target.files || [])

    if (files.length > 5) {
      setResultType('error')
      setMessage('You can upload a maximum of 5 evidence files.')
      event.target.value = ''
      return
    }

    const tooLarge = files.find(
      file => file.size > 50 * 1024 * 1024
    )

    if (tooLarge) {
      setResultType('error')
      setMessage('Each evidence file must be 50 MB or smaller.')
      event.target.value = ''
      return
    }

    setEvidence(files)
    setMessage('')
  }

  const handleSubmit = async event => {
    event.preventDefault()

    if (!currentUser) {
      setResultType('error')
      setMessage('Please sign in before submitting a report.')
      return
    }

    if (currentUser.role !== 'student') {
      setResultType('error')
      setMessage('Only student accounts can submit fraud reports.')
      return
    }

    if (!description.trim()) {
      setResultType('error')
      setMessage('Please describe what happened.')
      return
    }

    const formData = new FormData()

    formData.append('listing_id', listingId)
    formData.append('reporter_id', currentUser.id)
    formData.append('category', category)
    formData.append('description', description.trim())
    formData.append(
      'visit_confirmed',
      visitConfirmed ? '1' : '0'
    )

    evidence.forEach(file => {
      formData.append('evidence', file)
    })

    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not submit report.')
      }

      setResultType('success')
      setMessage(
        `Report submitted for admin review. Automated risk: ${data.risk_level} (${data.risk_score}/100).`
      )

      setCategory('scam')
      setDescription('')
      setVisitConfirmed(false)
      setEvidence([])

      const fileInput = document.getElementById(
        `fraud-evidence-${listingId}`
      )

      if (fileInput) {
        fileInput.value = ''
      }

      if (onSubmitted) {
        onSubmitted(data)
      }
    } catch (error) {
      setResultType('error')
      setMessage(error.message || 'Could not submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-red-200 bg-red-50/40 rounded-2xl p-5 space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <i className="fa-solid fa-shield-halved text-red-600"></i>
          <h3 className="font-semibold text-slate-900">
            Report this listing or landlord
          </h3>
        </div>

        <p className="text-sm text-slate-600">
          Report suspected scams, misleading photos, unsafe
          conditions or fraudulent landlord behaviour for admin
          review.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          What are you reporting?
        </label>

        <select
          value={category}
          onChange={event => setCategory(event.target.value)}
          className="w-full border border-slate-300 rounded-xl px-3 py-3 bg-white text-sm outline-none focus:ring-2 focus:ring-red-200"
        >
          <option value="scam">Scam / Fraud</option>
          <option value="fake_landlord">Fake landlord</option>
          <option value="misleading_photos">
            Misleading property photos
          </option>
          <option value="unsafe_condition">
            Unsafe property condition
          </option>
          <option value="payment_fraud">
            Suspicious payment / advance request
          </option>
          <option value="other">Other suspicious activity</option>
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={visitConfirmed}
          onChange={event =>
            setVisitConfirmed(event.target.checked)
          }
          className="mt-1"
        />

        <span>
          <span className="block text-sm font-medium text-slate-800">
            I personally visited this property
          </span>

          <span className="block text-xs text-slate-500 mt-0.5">
            Select this if you visited the property or met the
            landlord before making this report.
          </span>
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Describe what happened
        </label>

        <textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          maxLength={3000}
          placeholder="For example: I visited the property and the landlord asked for advance payment but could not provide valid ownership or rental documents..."
          className="w-full border border-slate-300 rounded-xl px-3 py-3 bg-white text-sm resize-y outline-none focus:ring-2 focus:ring-red-200"
        />

        <p className="text-xs text-slate-400 text-right mt-1">
          {description.length}/3000
        </p>
      </div>

      <div>
        <label
          htmlFor={`fraud-evidence-${listingId}`}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Photo or video evidence
        </label>

        <input
          id={`fraud-evidence-${listingId}`}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={handleFiles}
          className="block w-full text-sm text-slate-600 border border-slate-300 rounded-xl bg-white p-3"
        />

        <p className="text-xs text-slate-500 mt-2">
          Up to 5 JPG, PNG, WEBP, MP4, WEBM or MOV files.
          Maximum 50 MB per file.
        </p>

        {evidence.length > 0 && (
          <div className="mt-3 space-y-1">
            {evidence.map((file, index) => (
              <p
                key={`${file.name}-${index}`}
                className="text-xs text-slate-600"
              >
                {index + 1}. {file.name}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-3">
        <p className="text-xs text-slate-600">
          Reports are not automatically published as fraud.
          Evidence is sent to the admin for verification.
          Automated detection only provides a risk indicator to
          support review.
        </p>
      </div>

      {message && (
        <div
          className={
            resultType === 'success'
              ? 'rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm'
              : 'rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm'
          }
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        <i className="fa-solid fa-flag"></i>
        {submitting ? 'Submitting report...' : 'Submit for Admin Review'}
      </button>
    </form>
  )
}

export default FraudReportForm