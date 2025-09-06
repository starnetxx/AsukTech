import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AuthForm } from './components/auth/AuthForm';
import { UserDashboard } from './components/user/UserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { initPWASessionManagement, debugStorage } from './utils/pwaUtils';
import { supabase } from './utils/supabase';

// Import auth debug utilities (available in console as window.authDebug)
import './utils/authDebug';
// Import auth test utilities (available in console as window.testAuth)
import './utils/testAuth';
// Import data loading test utilities (available in console as window.testDataLoading)
import './utils/testDataLoading';
// Import stuck loading debug utility (available in console as window.debugStuckLoading)
import './utils/debugStuckLoading';
// Import data loading debug utility (available in console as window.debugDataLoading)
import './utils/debugDataLoading';
// Import Supabase data debug utility (available in console as window.supabaseDebug)
import './utils/supabaseDataDebug';
import './RefreshAuthFix.js'; // Temporary fix for auth persistence issue

// Make PWA debug available in console
if (typeof window !== 'undefined') {
  (window as any).pwaDebug = debugStorage;
}

function AppContent() {
  const { user, authUser, isAdmin, loading, shouldShowLogin, sessionLoaded } = useAuth();
  const [startupWaitExpired, setStartupWaitExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStartupWaitExpired(true), 8000);
    return () => clearTimeout(t);
  }, []);

  // Show loading while waiting for initial session, but fail-safe after timeout
  if ((!sessionLoaded && !startupWaitExpired) || ((loading && !authUser) && !startupWaitExpired)) {
    return (
      <div className="min-h-screen bg-[#4285F4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="text-white text-xl">Loading Starline Networks...</div>
        </div>
      </div>
    );
  }

  // User is authenticated - show appropriate dashboard (even if profile is still loading)
  if (authUser) {
    if (isAdmin) {
      return <AdminDashboard />;
    }
    return <UserDashboard />;
  }

  // Not authenticated - show login form
  const isAdminRoute = window.location.pathname.includes('/admin');
  return <AuthForm isAdmin={isAdminRoute} />;
}

function App() {
  useEffect(() => {
    // Initialize PWA session management
    initPWASessionManagement();
    
    // Log PWA status
    console.log('PWA initialized. Debug with: window.pwaDebug()');
  }, []);

  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;