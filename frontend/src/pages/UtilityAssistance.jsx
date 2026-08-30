import { useState } from 'react'

export default function UtilityAssistance() {
  const [formData, setFormData] = useState({
    student_name: '',
    email: '',
    phone: '',
    property_address: '',
    move_in_date: '',
    gas_required: false,
    electricity_required: false,
    water_required: false,
    wifi_required: false,
    additional_notes: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setMessage('')
    setError('')

    if (
      !formData.gas_required &&
      !formData.electricity_required &&
      !formData.water_required &&
      !formData.wifi_required
    ) {
      setError('Please select at least one utility service.')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(
        'http://localhost:8000/api/utility-assistance/request',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit request.')
      }

      setMessage('Utility assistance request submitted successfully.')

      setFormData({
        student_name: '',
        email: '',
        phone: '',
        property_address: '',
        move_in_date: '',
        gas_required: false,
        electricity_required: false,
        water_required: false,
        wifi_required: false,
        additional_notes: ''
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Utility Connection Assistance
            </h1>

            <p className="mt-2 text-slate-600">
              Moving into a new rental? Request help setting up gas,
              electricity, water, and WiFi services.
            </p>
          </div>

          {message && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Student Name *
                </label>

                <input
                  type="text"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="student@example.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Move-in Date *
                </label>

                <input
                  type="date"
                  name="move_in_date"
                  value={formData.move_in_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rental Property Address *
              </label>

              <textarea
                name="property_address"
                value={formData.property_address}
                onChange={handleChange}
                required
                rows="3"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your new rental address"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                Utilities Required
              </h2>

              <p className="text-sm text-slate-500 mb-4">
                Select one or more services you need help connecting.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name="gas_required"
                    checked={formData.gas_required}
                    onChange={handleChange}
                    className="h-5 w-5"
                  />

                  <span className="font-medium text-slate-700">
                    Gas Connection
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name="electricity_required"
                    checked={formData.electricity_required}
                    onChange={handleChange}
                    className="h-5 w-5"
                  />

                  <span className="font-medium text-slate-700">
                    Electricity Connection
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name="water_required"
                    checked={formData.water_required}
                    onChange={handleChange}
                    className="h-5 w-5"
                  />

                  <span className="font-medium text-slate-700">
                    Water Connection
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name="wifi_required"
                    checked={formData.wifi_required}
                    onChange={handleChange}
                    className="h-5 w-5"
                  />

                  <span className="font-medium text-slate-700">
                    WiFi Setup
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes
              </label>

              <textarea
                name="additional_notes"
                value={formData.additional_notes}
                onChange={handleChange}
                rows="4"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special instructions or additional information..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Request Utility Assistance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}