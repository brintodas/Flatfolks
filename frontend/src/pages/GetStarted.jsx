import { useNavigate } from 'react-router-dom'

function GetStarted() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create an account</h1>
          <p className="text-slate-500">Who are you signing up as?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Student card */}
          <button
            onClick={() => navigate('/signup/student')}
            className="text-left border border-slate-200 bg-white rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fa-solid fa-graduation-cap text-blue-600 text-lg"></i>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-700">I'm a Student</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Looking for a flat, a sublet, or a roommate near campus. Sign up with your BRACU email to get a verified student badge.
            </p>
            <span className="inline-block mt-4 text-sm font-semibold text-blue-600">
              Sign up as Student →
            </span>
          </button>

          {/* Landlord card */}
          <button
            onClick={() => navigate('/signup/landlord')}
            className="text-left border border-slate-200 bg-white rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fa-solid fa-building text-slate-600 text-lg"></i>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-700">I'm a Landlord</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              I own property and want to list it for students. Upload your ownership documents after signup to get a verified landlord badge.
            </p>
            <span className="inline-block mt-4 text-sm font-semibold text-blue-600">
              Sign up as Landlord →
            </span>
          </button>

        </div>

        <p className="text-sm text-slate-400 mt-8">
          Already have an account?{' '}
          <a href="/signin" className="text-blue-600 hover:underline font-medium">Sign in</a>
        </p>

      </div>
    </div>
  )
}

export default GetStarted
