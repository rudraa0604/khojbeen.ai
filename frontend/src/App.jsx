import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import ScrollProgressBar from './components/ScrollProgressBar';
import ChatAssistant from './components/ChatAssistant';
import LandingSplash from './components/LandingSplash';

// Pages
import Home from './pages/Home';
import ReportLost from './pages/ReportLost';
import ReportFound from './pages/ReportFound';
import Search from './pages/Search';
import ScanQR from './pages/ScanQR';
import ItemDetail from './pages/ItemDetail';
import ClaimForm from './pages/ClaimForm';
import FacultyCoordinators from './pages/FacultyCoordinators';
import FAQ from './pages/FAQ';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ItemTagPublic from './pages/ItemTagPublic';
import NotFound from './pages/NotFound';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Show landing splash when opening website
  const [showLanding, setShowLanding] = useState(true);

  const handleToggleCollapse = (val) => {
    setIsCollapsed(val);
    localStorage.setItem('sidebar_collapsed', val ? 'true' : 'false');
  };

  const handleEnterPortal = () => {
    setShowLanding(false);
  };

  return (
    <div className="flex flex-col min-h-screen ambient-bg text-slate-900 dark:text-slate-100 selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      {/* Landing Splash Screen on Initial Visit */}
      <LandingSplash 
        isOpen={showLanding} 
        onEnter={handleEnterPortal} 
      />

      <Navbar 
        onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileOpen}
        onOpenWelcome={() => setShowLanding(true)}
      />
      
      <div className="flex-1 flex flex-row relative">
        {/* Left Sidebar */}
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={handleToggleCollapse}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Main Content Area */}
        <div 
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
            isCollapsed 
              ? 'lg:pl-20 rtl:lg:pl-0 rtl:lg:pr-20' 
              : 'lg:pl-64 rtl:lg:pl-0 rtl:lg:pr-64'
          }`}
        >
          <main id="main-content" className="flex-1 w-full max-w-full overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/report-lost" element={<ReportLost />} />
              <Route path="/report-found" element={<ReportFound />} />
              <Route path="/search" element={<Search />} />
              <Route path="/scan" element={<ScanQR />} />
              <Route path="/faculty" element={<FacultyCoordinators />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/my-items" element={<Navigate to="/dashboard?tab=tagged" replace />} />
              <Route path="/tag/:uniqueCode" element={<ItemTagPublic />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/claim/:id" element={<ClaimForm />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </div>

      <CookieBanner />
      <ChatAssistant />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ScrollProgressBar />
      <MainLayout />
    </BrowserRouter>
  );
}
