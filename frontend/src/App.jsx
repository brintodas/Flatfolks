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

import PostListing     from './pages/PostListing'
import Listings        from './pages/Listings'
import Watchlist       from './pages/Watchlist'
import ListingDetail   from './pages/ListingDetail'
import GetStarted      from './pages/GetStarted'
import StudentSignup   from './pages/StudentSignup'
import LandlordSignup  from './pages/LandlordSignup'
import SignIn          from './pages/SignIn'

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
          <Route path="/"                  element={<Home />} />
          <Route path="/listings"           element={<Listings />} />
          <Route path="/post-listing"       element={<PostListing />} />
          <Route path="/watchlist"          element={<Watchlist />} />
          <Route path="/listings/:id"       element={<ListingDetail />} />
          <Route path="/get-started"        element={<GetStarted />} />
          <Route path="/signup/student"     element={<StudentSignup />} />
          <Route path="/signup/landlord"    element={<LandlordSignup />} />
          <Route path="/signin"             element={<SignIn />} />
        
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
