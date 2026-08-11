const Footer = () => {
  const links = {
    Students: ['Browse Listings', 'Find Roommates', 'Compatibility Quiz', 'Saved Listings', 'Move-In Support'],
    Landlords: ['Post a Listing', 'Manage Properties', 'Get Verified', 'Tenant Applications', 'Pricing Plans'],
    Company:   ['About Us', 'Contact', 'Privacy Policy', 'Terms of Service', 'Help Center'],
  }

  return (
    <footer className="bg-blue-950 text-blue-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-house-chimney text-white text-lg"></i>
              </div>
              <span className="text-xl font-black text-white">
                Flat<span className="text-blue-400">folks</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6 text-blue-400">
              Bangladesh's trusted student housing and roommate finder. Verified listings. Smart matching. Secure platform.
            </p>
            <div className="flex gap-3">
              {[
                { icon: 'fa-facebook-f', href: '#' },
                { icon: 'fa-instagram',  href: '#' },
                { icon: 'fa-twitter',    href: '#' },
                { icon: 'fa-linkedin-in',href: '#' },
              ].map((social, i) => (
                <a key={i} href={social.href}
                  className="w-9 h-9 bg-blue-900 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all">
                  <i className={`fa-brands ${social.icon} text-sm text-white`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{title}</h4>
              <ul className="space-y-2.5 text-sm">
                {items.map((item, i) => (
                  <li key={i}>
                    <a href="#" className="hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-500">
          <p>© 2026 Flatfolks. All rights reserved. Built for students, by students.</p>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-check text-green-500"></i>
            <span>SSL Secured · Verified Platform</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
