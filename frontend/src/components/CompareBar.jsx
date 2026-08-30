import { useNavigate } from 'react-router-dom'

// Floating bar that appears once the user has selected 1-2 listings
// to compare from a grid/list of cards (e.g. the Listings page).
// `selected` is an array of up to 2 listing objects: [{id, title, photos}, ...]
function CompareBar({ selected, onRemove, onClear }) {
  const navigate = useNavigate()
  if (!selected || selected.length === 0) return null

  const goCompare = () => {
    const params = new URLSearchParams()
    if (selected[0]) params.set('a', selected[0].id)
    if (selected[1]) params.set('b', selected[1].id)
    navigate(`/compare?${params.toString()}`)
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <i className="fa-solid fa-scale-balanced text-blue-600 text-lg shrink-0"></i>
          <div className="flex gap-2 overflow-x-auto">
            {selected.map(l => (
              <div key={l.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full pl-1 pr-2 py-1 shrink-0">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                  {l.photos ? (
                    <img src={`http://localhost:8000/uploads/${l.photos.split(',')[0]}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                      <i className="fa-solid fa-house"></i>
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-blue-800 max-w-[100px] truncate">{l.title}</span>
                <button onClick={() => onRemove(l.id)} className="text-blue-400 hover:text-blue-700">
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              </div>
            ))}
            {selected.length === 1 && (
              <span className="text-xs text-slate-400 self-center whitespace-nowrap">Pick one more...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onClear} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Clear
          </button>
          <button
            onClick={goCompare}
            disabled={selected.length < 1}
            className="text-xs font-bold px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Compare {selected.length === 2 ? '' : `(${selected.length}/2)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompareBar