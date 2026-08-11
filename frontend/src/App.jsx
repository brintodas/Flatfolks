import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar           from './components/Navbar'
import Footer           from './components/Footer'
import HeroSection      from './components/HeroSection'
import StatsBar         from './components/StatsBar'
import CategoryFilter   from './components/CategoryFilter'
import FeaturedListings from './components/FeaturedListings'
import HowItWorks       from './components/HowItWorks'
import RoommateMatch    from './components/RoommateMatch'
import Neighborhoods    from './components/Neighborhoods'
import FeaturesGrid     from './components/FeaturesGrid'
import LandlordCta      from './components/LandlordCta'
import Testimonials     from './components/Testimonials'

import PostListing from './pages/PostListing'
import Listings    from './pages/Listings'

// Home page - all the sections together
function Home() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <CategoryFilter />
      <FeaturedListings />
      <HowItWorks />
      <RoommateMatch />
      <Neighborhoods />
      <FeaturesGrid />
      <LandlordCta />
      <Testimonials />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="overflow-x-hidden">
        <Navbar />
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/listings"     element={<Listings />} />
          <Route path="/post-listing" element={<PostListing />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
