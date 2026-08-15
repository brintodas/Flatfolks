const neighborhoods = [
  { name: 'Dhanmondi', avg: '৳13,500/mo', img: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=70' },
  { name: 'Mirpur',    avg: '৳7,500/mo',  img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=70' },
  { name: 'Uttara',    avg: '৳9,200/mo',  img: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=400&q=70' },
  { name: 'Bashundhara', avg: '৳12,000/mo', img: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&q=70' },
  { name: 'Mohammadpur', avg: '৳8,800/mo', img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=70' },
]

import { useNavigate } from 'react-router-dom'

const Neighborhoods = () => {
  const navigate = useNavigate()

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Explore by Area</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Popular Student Neighborhoods</h2>
          <p className="text-slate-500 mt-3">Live near your campus with real neighborhood insights.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {neighborhoods.map((nbr, i) => (
            <div key={i} 
              onClick={() => navigate(`/listings?search=${nbr.name}`)}
              className="relative rounded-2xl overflow-hidden cursor-pointer shadow-md group"
              style={{ aspectRatio: '3/4' }}>
              <img src={nbr.img} alt={nbr.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.target.parentElement.style.background = 'linear-gradient(160deg,#1e40af,#0f2044)'
                  e.target.style.display = 'none'
                }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'rgba(30,64,175,0.3)' }}></div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-bold text-sm mb-0.5">{nbr.name}</h3>
                <p className="text-blue-200 text-xs">Avg {nbr.avg}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default Neighborhoods
