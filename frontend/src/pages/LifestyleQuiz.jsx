import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QUIZ_QUESTIONS } from '../utils/quizMeta'

const emptyAnswers  = Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.key,            null]))
const emptyWeights  = Object.fromEntries(QUIZ_QUESTIONS.map((q) => [`w_${q.key}`,     null]))

const PRIORITY_LABELS = ['Not important', 'Slightly', 'Moderate', 'Important', 'Must match']

function LifestyleQuiz() {
  const navigate    = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')
  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [weights, setWeights] = useState(emptyWeights)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <i className="fa-solid fa-lock text-slate-300 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Sign in required</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in as a student to take the lifestyle compatibility quiz.</p>
          <Link to="/signin" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">Sign In</Link>
        </div>
      </div>
    )
  }

  if (currentUser.role !== 'student') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <i className="fa-solid fa-user-graduate text-slate-300 text-4xl mb-4"></i>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Students only</h2>
          <p className="text-slate-500 text-sm mb-6">The lifestyle quiz is for students looking for roommates.</p>
          <Link to="/" className="px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800">Go Home</Link>
        </div>
      </div>
    )
  }

  const question   = QUIZ_QUESTIONS[step]
  const wKey       = `w_${question.key}`
  const progress   = ((step + 1) / QUIZ_QUESTIONS.length) * 100
  const canAdvance = answers[question.key] != null && weights[wKey] != null
  const allDone    = QUIZ_QUESTIONS.every((q) => answers[q.key] != null && weights[`w_${q.key}`] != null)

  const selectOption   = (value) => { setAnswers((p) => ({ ...p, [question.key]: value })); setError('') }
  const selectPriority = (value) => { setWeights((p) => ({ ...p, [wKey]: value })); setError('') }

  const goNext = () => {
    if (!canAdvance) { setError('Please choose both an option and a priority to continue.'); return }
    setError('')
    if (step < QUIZ_QUESTIONS.length - 1) setStep((s) => s + 1)
  }

  const goBack = () => { setError(''); if (step > 0) setStep((s) => s - 1) }

  const handleSubmit = async () => {
    if (!allDone) { setError('Please answer every question and set its priority before submitting.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('http://localhost:8000/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, ...answers, ...weights }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message || 'Could not save quiz.'); setSaving(false); return }
      localStorage.setItem('ff_user', JSON.stringify({ ...currentUser, ...data.quiz, quiz_completed: 1 }))
      navigate('/roommates')
    } catch {
      setError('Could not connect to server.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Lifestyle Compatibility</p>
          <h1 className="text-2xl font-bold text-slate-800">Roommate Quiz</h1>
          <p className="text-sm text-slate-500 mt-1">
            For each question, pick your answer <em>and</em> how important this trait is when matching you with a roommate.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Question {step + 1} of {QUIZ_QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {/* Question header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
              <i className={`fa-solid ${question.icon}`}></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{question.label}</p>
              <h2 className="text-lg font-semibold text-slate-800">{question.prompt}</h2>
            </div>
          </div>

          {/* Answer options */}
          <div className="space-y-2.5 mb-6">
            {question.options.map((opt) => {
              const selected = answers[question.key] === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectOption(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {selected && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{opt.title}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Priority selector */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              How important is this to you when choosing a roommate?
            </p>
            <p className="text-xs text-slate-400 mb-3">This shapes how much weight this trait gets in your match score.</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => {
                const active = weights[wKey] === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => selectPriority(v)}
                    title={PRIORITY_LABELS[v - 1]}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-0.5">
              <span>Not important</span>
              <span>Must match</span>
            </div>
            {weights[wKey] != null && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                Priority: <strong>{PRIORITY_LABELS[weights[wKey] - 1]}</strong>
              </p>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>

            {step < QUIZ_QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !allDone}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving...' : 'See Matches'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">You can retake this anytime from your roommate profile.</p>
      </div>
    </div>
  )
}

export default LifestyleQuiz
