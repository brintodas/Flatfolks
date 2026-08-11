const stats = [
  { value: '12,400+', label: 'Verified Listings' },
  { value: '58,000+', label: 'Students Matched' },
  { value: '320+',    label: 'Universities Covered' },
  { value: '4.8 ★',  label: 'Average Rating', star: true },
]

const StatsBar = () => {
  return (
    <section className="bg-blue-950 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 sm:divide-x divide-blue-800">
          {stats.map((stat, i) => (
            <div key={i} className="text-center sm:px-6">
              <p className={`text-2xl sm:text-3xl font-black ${stat.star ? 'text-yellow-400' : 'text-white'}`}>
                {stat.value}
              </p>
              <p className="text-sm text-blue-300 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StatsBar
