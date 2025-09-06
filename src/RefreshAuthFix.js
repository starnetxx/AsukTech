// RefreshAuthFix.js - Temporary fix for auth persistence issue
// Place this file in your src folder and import it at the TOP of your App.js or index.js

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (adjust these to match your env variables)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dznshvaxqirnxznmfwdc.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bnNodmF4cWlybnh6bm1md2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0MzcxMjgsImV4cCI6MjAzODAxMzEyOH0.52y3t_S_2G1m8x77n1dUl1rP_5-i0dG6Ed14Q91S5gA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Key to track refresh state
const REFRESH_DETECTED_KEY = 'app_refresh_detected';
const AUTH_STATE_KEY = 'app_was_authenticated';
const NAVIGATION_TYPE_KEY = 'app_navigation_type';

// Function to clear all auth-related data
const clearAllAuthData = () => {
  console.log('[RefreshFix] Clearing all auth data...');
  
  // Clear Supabase specific storage
  const supabaseKeys = [
    'supabase.auth.token',
    'supabase.auth.token.new',
    'supabase.auth.expiry',
    'sb-access-token',
    'sb-refresh-token'
  ];
  
  supabaseKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  // Clear any keys that contain 'supabase' or 'auth'
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear cookies that might contain auth data
  document.cookie.split(";").forEach((c) => {
    const cookie = c.trim();
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
    }
  });
  
  console.log('[RefreshFix] Auth data cleared');
};

// Function to detect if this is a page refresh
const isPageRefresh = () => {
  const navigationType = performance.navigation?.type;
  const entries = performance.getEntriesByType('navigation');
  
  if (entries && entries.length > 0) {
    const navEntry = entries[0];
    return navEntry.type === 'reload';
  }
  
  // Fallback for older browsers
  return navigationType === 1 || navigationType === performance.navigation?.TYPE_RELOAD;
};

// Function to check if user was previously authenticated
const wasUserAuthenticated = async () => {
  try {
    // First check our flag
    const authFlag = sessionStorage.getItem(AUTH_STATE_KEY);
    if (authFlag === 'true') {
      return true;
    }
    
    // Also check if there's any auth token present
    const authToken = localStorage.getItem('supabase.auth.token');
    if (authToken) {
      try {
        const parsed = JSON.parse(authToken);
        return !!parsed.access_token;
      } catch {
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[RefreshFix] Error checking auth state:', error);
    return false;
  }
};

// Main initialization function
const initializeRefreshFix = async () => {
  console.log('[RefreshFix] Initializing refresh detection...');
  
  try {
    // Check if this is a page refresh
    const isRefresh = isPageRefresh();
    console.log('[RefreshFix] Is page refresh?', isRefresh);
    
    // Check if user was authenticated
    const wasAuthenticated = await wasUserAuthenticated();
    console.log('[RefreshFix] Was authenticated?', wasAuthenticated);
    
    // Get the current refresh detection state
    const refreshDetected = sessionStorage.getItem(REFRESH_DETECTED_KEY);
    
    if (isRefresh && wasAuthenticated && !refreshDetected) {
      console.log('[RefreshFix] Refresh detected for authenticated user. Clearing auth data...');
      
      // Mark that we've detected and handled this refresh
      sessionStorage.setItem(REFRESH_DETECTED_KEY, 'true');
      
      // Clear all auth data
      clearAllAuthData();
      
      // Sign out from Supabase to ensure clean state
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[RefreshFix] Error signing out:', error);
      }
      
      // Clear the auth state flag
      sessionStorage.removeItem(AUTH_STATE_KEY);
      
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        console.log('[RefreshFix] Cleanup complete. Ready for fresh login.');
        // Clear the refresh detected flag after a moment
        sessionStorage.removeItem(REFRESH_DETECTED_KEY);
      }, 100);
      
    } else if (!isRefresh) {
      // This is a normal navigation, not a refresh
      console.log('[RefreshFix] Normal navigation detected');
      sessionStorage.removeItem(REFRESH_DETECTED_KEY);
    }
    
    // Set up listener to track authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[RefreshFix] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // User just signed in, mark as authenticated
        sessionStorage.setItem(AUTH_STATE_KEY, 'true');
        console.log('[RefreshFix] User signed in, auth state marked');
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear the flag
        sessionStorage.removeItem(AUTH_STATE_KEY);
        sessionStorage.removeItem(REFRESH_DETECTED_KEY);
        console.log('[RefreshFix] User signed out, auth state cleared');
      }
    });
    
    // Store the subscription for cleanup if needed
    window.__authSubscription = subscription;
    
  } catch (error) {
    console.error('[RefreshFix] Error in initialization:', error);
  }
};

// Function to manually trigger cleanup (useful for debugging)
window.forceAuthCleanup = () => {
  console.log('[RefreshFix] Manually forcing auth cleanup...');
  clearAllAuthData();
  sessionStorage.removeItem(AUTH_STATE_KEY);
  sessionStorage.removeItem(REFRESH_DETECTED_KEY);
  window.location.reload();
};

// Run initialization immediately when this file loads
initializeRefreshFix();

// Also ensure it runs after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRefreshFix);
}

// Export for use in other files if needed
export { clearAllAuthData, initializeRefreshFix };

// Add helper text to console
console.log(`
╔════════════════════════════════════════════╗
║   TEMPORARY REFRESH FIX ACTIVE             ║
║                                            ║
║   Auth will be cleared on page refresh     ║
║   when user is logged in.                  ║
║                                            ║
║   To manually clear auth, run:             ║
║   > window.forceAuthCleanup()              ║
╔════════════════════════════════════════════╝
`);
