import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

import Navbar           from './components/Navbar'
import Footer           from './components/Footer'
import HeroSection      from './components/HeroSection'
import CategoryFilter   from './components/CategoryFilter'
import FeaturedListings from './components/FeaturedListings'
import HowItWorks       from './components/HowItWorks'
import RoommateMatch    from './components/RoommateMatch'
import Neighborhoods    from './components/Neighborhoods'
import FeaturesGrid     from './components/FeaturesGrid'
import LandlordCta      from './components/LandlordCta'


import PostListing     from './pages/PostListing'
import Listings        from './pages/Listings'
import Watchlist       from './pages/Watchlist'
import ListingDetail   from './pages/ListingDetail'
import GetStarted      from './pages/GetStarted'
import StudentSignup   from './pages/StudentSignup'
import LandlordSignup  from './pages/LandlordSignup'
import SignIn          from './pages/SignIn'
import RoommateProfile       from './pages/RoommateProfile'
import RoommatePublicProfile from './pages/RoommatePublicProfile'
import Roommates             from './pages/Roommates'
import Messages              from './pages/Messages'
import AdminDashboard        from './pages/AdminDashboard'
import LandlordProfileSetup  from './pages/LandlordProfileSetup'
import PublicLandlordProfile from './pages/PublicLandlordProfile'
import LandlordDashboard     from './pages/LandlordDashboard'
import LifestyleQuiz         from './pages/LifestyleQuiz'
import Compare                from './pages/Compare'

function ConditionalFooter() {
  const location = useLocation()
  if (location.pathname.startsWith('/messages')) return null
  return <Footer />
}

// Home page - all the sections together
function Home() {
  return (
    <>
      <HeroSection />
      <CategoryFilter />
      <FeaturedListings />
      <HowItWorks />
      <RoommateMatch />
      <Neighborhoods />
      <FeaturesGrid />
      <LandlordCta />

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
          <Route path="/roommate-profile"   element={<RoommateProfile />} />
          <Route path="/roommates"          element={<Roommates />} />
          <Route path="/roommate/:userId"   element={<RoommatePublicProfile />} />
          <Route path="/lifestyle-quiz"     element={<LifestyleQuiz />} />
          <Route path="/compare"            element={<Compare />} />

          <Route path="/messages"           element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/admin"              element={<AdminDashboard />} />

          {/* Landlord Profile / Business Account / Multi-Property Dashboard */}
          <Route path="/landlord/profile-setup"   element={<LandlordProfileSetup />} />
          <Route path="/landlord/:id"             element={<PublicLandlordProfile />} />
          <Route path="/landlord/:id/dashboard"   element={<LandlordDashboard />} />
        
        </Routes>
        <ConditionalFooter />
      </div>
    </BrowserRouter>
  )
}

export default App