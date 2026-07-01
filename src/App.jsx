import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LandingDashboard from './components/LandingDashboard';
import SearchSection from './components/Tenants/SearchSection';
import PropertyGrid from './components/Tenants/PropertyGrid';
import Footer from './components/Footer';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import EmailVerification from './components/EmailVerification';
import EmailVerificationPending from './components/EmailVerificationPending';
import ManagerRentSpace from './components/PropertyManager/RentSpace';
import AnalyticsReports from './components/PropertyManager/AnalyticsReports';
import BillingPayment from './components/PropertyManager/BillingPayment';
import ManageProperty from './components/PropertyManager/ManageProperty';
import AboutContact from './components/AboutContact';
import AdminDashboard from './components/Admin/Dashboard';
import AdminProfile from './components/Admin/Profile';
import AdminSettings from './components/Admin/Settings';
import AdminPropertyReview from './components/Admin/PropertyReview';
import AdminAnalytics from './components/Admin/Analytics';
import AdminSubscriptionManagement from './components/Admin/SubscriptionManagement';
import DocumentManagement from './components/Admin/DocumentManagement';
import ManagerDashboard from './components/PropertyManager/Dashboard';
import UpgradePlanModal from './components/PropertyManager/UpgradePlanModal';
import ApiService from './services/api';
import logger from './utils/logger';
import ErrorBoundary from './components/ErrorBoundary';
  
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('tenant'); // 'tenant' | 'manager' | 'admin'
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check for reset password and email verification URLs on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (token && email && window.location.pathname === '/reset-password') {
      setCurrentPage('reset-password');
    } else if (token && email && window.location.pathname === '/verify-email') {
      setCurrentPage('verify-email');
    }
  }, []);

  // Check for existing session on app load (only once)
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        // Don't restore session if we're on verification or signup pages
        const urlParams = new URLSearchParams(window.location.search);
        const isVerificationPage = window.location.pathname === '/verify-email' && urlParams.get('token');
        const isSignupPage = window.location.pathname === '/signup' || currentPage === 'signup';
        const isLoginPage = currentPage === 'login';
        const isResetPasswordPage = currentPage === 'reset-password';
        const isForgotPasswordPage = currentPage === 'forgot-password';
        
        // Don't restore session on auth pages
        if (isVerificationPage || isSignupPage || isLoginPage || isResetPasswordPage || isForgotPasswordPage) {
          setIsLoadingSession(false);
          return;
        }
        
        const token = localStorage.getItem('access_token');
        const savedRole = localStorage.getItem('user_role');
        const userId = localStorage.getItem('user_id');

        if (token && savedRole && userId) {
          // Restore authentication state
          setIsAuthenticated(true);
          setUserRole(savedRole.toLowerCase());
          
          // Check if user is already on a specific authenticated page
          // If so, don't redirect - let them stay where they are
          const authenticatedPages = [
            'rent-space', 'analyticsReports', 'billingPayment', 'manageProperty',
            'admin-dashboard', 'admin-profile', 'admin-settings', 'admin-property-review',
            'admin-analytics', 'admin-subscription-management', 'admin-document-management',
            'admin-property-approval'
          ];
          
          const isOnAuthenticatedPage = authenticatedPages.includes(currentPage);
          
          // Only redirect to default dashboard if we're on the public landing page
          // Don't override if user is already on an authenticated page
          if (!isOnAuthenticatedPage && currentPage === 'dashboard') {
            if (savedRole.toLowerCase() === 'admin') {
              setCurrentPage('admin-dashboard');
            }
            // For manager and tenant, 'dashboard' is correct, so don't change it
          }
          
          logger.debug('Session restored:', { role: savedRole, userId, currentPage });

        } else {
          logger.debug('No existing session found');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Clear any corrupted session data
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
      } finally {
        setIsLoadingSession(false);
      }
    };

    checkExistingSession();
    // Only run once on mount, not when currentPage changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for navigation to login events (from PropertyGrid when user tries to inquire without login)
  useEffect(() => {
    const handleNavigateToLogin = (event) => {
      setCurrentPage('login');
    };

    window.addEventListener('navigateToLogin', handleNavigateToLogin);
    
    return () => {
      window.removeEventListener('navigateToLogin', handleNavigateToLogin);
    };
  }, []);

  // Check subscription status for property managers after login
  useEffect(() => {
    const checkSubscriptionForUpgrade = async () => {
      // Only check for property managers who are authenticated and on manager pages
      if (isAuthenticated && userRole === 'manager' && 
          currentPage !== 'login' && currentPage !== 'signup' &&
          currentPage !== 'forgot-password' && currentPage !== 'reset-password' &&
          currentPage !== 'verify-email' && currentPage !== 'email-verification-pending') {
        try {
          const subscriptionRes = await ApiService.getCurrentSubscription();
          const subscription = subscriptionRes?.subscription || subscriptionRes;
          const planName = subscription?.plan?.name || '';
          const monthlyPrice = subscription?.plan?.monthly_price || 0;
          
          logger.debug('Subscription check:', { 
            planName, 
            monthlyPrice, 
            subscription: subscription?.plan,
            isAuthenticated,
            userRole,
            currentPage
          });
          
          // Check if user is on Free Plan (either "Free Plan" or "Basic" with $0 price)
          const isFreePlan = (planName && planName.toLowerCase() === 'free plan') || 
                            (planName && planName.toLowerCase() === 'basic' && Number(monthlyPrice) === 0) ||
                            (Number(monthlyPrice) === 0);
          
          // Show modal if user is on Free Plan
          if (isFreePlan) {
            const wasDismissed = sessionStorage.getItem('upgrade_modal_dismissed');
            
            if (!wasDismissed) {
              logger.debug('User is on Free Plan, showing upgrade modal');
              setShowUpgradeModal(true);
            } else {
              logger.debug('User is on Free Plan but modal was dismissed in this session');
            }
          } else {
            // User has upgraded, hide modal and clear dismissal flag
            logger.debug('User is not on Free Plan, hiding modal');
            setShowUpgradeModal(false);
            sessionStorage.removeItem('upgrade_modal_dismissed');
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          // Don't show modal if there's an error
        }
      }
    };

    // Check subscription when user is authenticated and is a manager
    // Delay slightly to ensure API is ready
    if (isAuthenticated && userRole === 'manager') {
      const timer = setTimeout(() => {
        checkSubscriptionForUpgrade();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userRole, currentPage]);

  const handlePageChange = (nextPage) => {
    if (nextPage === 'logout') {
      // Clear all session data
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_id');
      
      // Clear sessionStorage dismissal flags
      sessionStorage.removeItem('upgrade_modal_dismissed');
      
      setIsAuthenticated(false);
      setCurrentPage('dashboard');
      setUserRole('tenant');
      setShowUpgradeModal(false);
      
      // Reset previous authentication state
      logger.debug('User logged out, session cleared');
      return;
    }
    setCurrentPage(nextPage);
  };

  const [propertyFilters, setPropertyFilters] = useState({ city: '', type: '', min_price: '', max_price: '', bedrooms: '', search: '' });

  const renderContent = () => {
    // Handle Admin specific pages
    if (userRole === 'admin' && isAuthenticated) {
      switch (currentPage) {
        case 'admin-dashboard':
          return <AdminDashboard onPageChange={setCurrentPage} />;
        case 'admin-profile':
          return <AdminProfile />;
        case 'admin-settings':
          return <AdminSettings />;
        case 'admin-property-review':
          return <AdminPropertyReview />;
        case 'admin-analytics':
          return <AdminAnalytics />;
        case 'admin-subscription-management':
          return <AdminSubscriptionManagement />;
        case 'admin-document-management':
          return <DocumentManagement />;
        case 'admin-property-approval':
          return <AdminPropertyReview />;
        case 'about-contact':
          return <AboutContact />;
        default:
          return <AdminDashboard onPageChange={setCurrentPage} />;
      }
    }
    
    // Handle Property Manager specific pages
    if (userRole === 'manager' && isAuthenticated) {
      switch (currentPage) {
        case 'rent-space':
          return <ManagerRentSpace onPageChange={handlePageChange} />;
        case 'analyticsReports':
          return <AnalyticsReports />;
        case 'billingPayment':
          return <BillingPayment />;
        case 'manageProperty':
          return <ManageProperty onOpenManageUnits={() => handlePageChange('rent-space')} />;
        case 'about-contact':
          return <AboutContact />;
        default:
          return <ManagerDashboard onPageChange={handlePageChange} />;
      }
    }
    
    // Handle Tenant and public pages
    switch (currentPage) {
      case 'dashboard':
        return <LandingDashboard onPageChange={handlePageChange} />;
      case 'rent-space':
        return (
          <>
            <section className="mb-6 md:mb-8 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl p-4 md:p-6 shadow-lg">
              <h1 className="text-xl md:text-2xl font-black">Find Your Next Home</h1>
              <p className="text-xs md:text-sm text-gray-300 mt-1">Search and filter rental spaces that match your needs</p>
            </section>
            <div className="mb-6 md:mb-8">
              <SearchSection 
                filters={propertyFilters}
                onChange={setPropertyFilters}
              />
            </div>
            <PropertyGrid filters={propertyFilters} />
          </>
        );
      case 'about-contact':
        return <AboutContact />;
      default:
        return <LandingDashboard />;
    }
  };

  // Show loading screen while checking session
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <Login
        onLoginSuccess={({ role }) => {
          setIsAuthenticated(true);
          if (role === 'admin') {
            setUserRole('admin');
            setCurrentPage('admin-dashboard');
          } else if (role === 'manager') {
            setUserRole('manager');
            setCurrentPage('dashboard');
          } else {
            setUserRole('tenant');
            setCurrentPage('dashboard');
          }
        }}
        onBackToMain={() => setCurrentPage('dashboard')}
        onSignUpClick={() => setCurrentPage('signup')}
        onForgotPasswordClick={() => setCurrentPage('forgot-password')}
      />
    );
  }

  if (currentPage === 'signup') {
    return (
      <SignUp
        onSignUpSuccess={({ role, email }) => {
          // Email verification is disabled, redirect everyone to login directly
          setCurrentPage('login');
        }}
        onBackToLogin={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'forgot-password') {
    return (
      <ForgotPassword
        onBackToLogin={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'reset-password') {
    return (
      <ResetPassword
        onResetSuccess={() => setCurrentPage('login')}
        onBackToLogin={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'verify-email') {
    return (
      <EmailVerification
        onVerificationComplete={(user) => {
          // Clear any existing session data first to prevent logging in to wrong account
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token'); // Legacy token key
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_id');
          
          // Clear any pending verification data
          localStorage.removeItem('pending_verification_session');
          localStorage.removeItem('pending_verification_email');
          
          // Store verified email to show success message on login page
          if (user && user.email) {
            localStorage.setItem('verified_email', user.email);
          }
          
          // Reset authentication state
          setIsAuthenticated(false);
          setUserRole('tenant');
          
          // Redirect to login page - user needs to log in to get JWT token
          setCurrentPage('login');
        }}
        onBack={() => setCurrentPage('login')}
      />
    );
  }

  if (currentPage === 'email-verification-pending') {
    return (
      <EmailVerificationPending
        email={pendingVerificationEmail}
        onResendEmail={() => {
          // Optional: Show success message or update UI
        }}
        onBackToLogin={() => setCurrentPage('login')}
        onVerificationReceived={(user) => {
          // Clear any existing session data first to prevent logging in to wrong account
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token'); // Legacy token key
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_id');
          
          // Clear verification session
          localStorage.removeItem('pending_verification_session');
          localStorage.removeItem('pending_verification_email');
          
          // Store verified email to show success message on login page
          if (user && user.email) {
            localStorage.setItem('verified_email', user.email);
          }
          
          // Reset authentication state
          setIsAuthenticated(false);
          setUserRole('tenant');
          
          // Redirect to login page - user needs to log in to get JWT token
          setCurrentPage('login');
        }}
      />
    );
  }

  const handleUpgradeClick = (plan) => {
    // Navigate to billing page for upgrade
    setCurrentPage('billingPayment');
    setShowUpgradeModal(false);
  };

  const handleCloseUpgradeModal = () => {
    setShowUpgradeModal(false);
    // Store dismissal in sessionStorage to prevent showing again this session
    sessionStorage.setItem('upgrade_modal_dismissed', 'true');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white flex flex-col">
        <Header
          currentPage={currentPage}
          onPageChange={handlePageChange}
          isAuthenticated={isAuthenticated}
          userRole={userRole}
        />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
          {renderContent()}
        </main>
        <Footer />
        {/* Upgrade Plan Modal - only show for property managers */}
        {isAuthenticated && userRole === 'manager' && (
          <UpgradePlanModal
            isOpen={showUpgradeModal}
            onClose={handleCloseUpgradeModal}
            onUpgrade={handleUpgradeClick}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
