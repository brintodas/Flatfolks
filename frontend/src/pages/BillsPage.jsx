import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import BillDashboard from '../components/bills/BillDashboard'

export default function BillsPage() {
  useEffect(() => {
    document.title = 'Shared Bills & Roommate Expenses – Flatfolks'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/" className="hover:text-blue-700 transition-colors">
            Home
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <Link to="/roommates" className="hover:text-blue-700 transition-colors">
            Roommates
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="text-slate-800 font-semibold">Shared Bills</span>
        </nav>
      </div>

      {/* Main Dashboard */}
      <BillDashboard />
    </div>
  )
}
