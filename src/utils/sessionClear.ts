import { supabase } from './supabase';
import { clearAllAppDataAndCookies } from './pwaUtils';

/**
 * Completely clear all session data and redirect to login
 * This is a nuclear option that ensures a clean state
 */
export const clearAllSessionData = async (): Promise<void> => {
  try {
    console.log('Clearing all session data...');
    
    // 1. Clear all app data and cookies
    await clearAllAppDataAndCookies();
    
    // 2. Sign out from Supabase
    await supabase.auth.signOut();
    
    // 3. Clear all localStorage
    localStorage.clear();
    
    // 4. Clear all sessionStorage
    sessionStorage.clear();
    
    // 5. Clear any remaining cookies manually
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
    });
    
    console.log('All session data cleared successfully');
    
  } catch (error) {
    console.error('Error clearing session data:', error);
    
    // Force clear even if there are errors
    try {
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
    } catch (forceError) {
      console.error('Error in force clear:', forceError);
    }
  }
};

/**
 * Clear session data and redirect to login page
 */
export const clearSessionAndRedirect = async (): Promise<void> => {
  await clearAllSessionData();
  
  // Force redirect to login page
  window.location.replace('/login');
};