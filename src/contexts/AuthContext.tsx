import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { User } from '../types';

import { clearSessionAndRedirect } from '../utils/sessionClear';

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  profileLoading: boolean;
  initialAuthCheck: boolean;
  sessionLoaded: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, phone?: string, referredBy?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateWalletBalance: (amount: number) => Promise<void>;
  refreshProfile: () => void;
  refreshSession: () => Promise<void>;
  retryProfileFetch: () => Promise<void>;
  retryProfileFetchWithBackoff: (maxRetries?: number) => Promise<void>;
  checkSupabaseConnection: () => Promise<boolean>;
  validateSupabaseConfig: () => boolean;
  getErrorMessage: (error: any) => string;
  getDetailedErrorInfo: (error: any) => {
    message: string;
    code: string;
    details: string;
    hint: string;
    userFriendlyMessage: string;
    suggestedAction: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  createMinimalUserProfile: (authUser: AuthUser) => User;
  isUserDegraded: () => boolean;
  recoverUserProfile: () => Promise<boolean>;
  getProfileFetchStatus: () => {
    hasUser: boolean;
    hasAuthUser: boolean;
    isDegraded: boolean;
    profileLoading: boolean;
    loading: boolean;
    initialAuthCheck: boolean;
    connectionOk: boolean | null;
    lastError: string | null;
  };
  diagnoseProfileIssue: () => Promise<string>;
  forceProfileRecovery: () => Promise<{ success: boolean; message: string }>;
  getAuthStateSummary: () => {
    timestamp: string;
    authUser: any;
    user: any;
    loading: boolean;
    profileLoading: boolean;
    initialAuthCheck: boolean;
    isAdmin: boolean;
    connectionStatus: 'unknown' | 'checking' | 'ok' | 'failed';
  };
  shouldShowLogin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [lastProfileFetch, setLastProfileFetch] = useState<number>(0);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);


  // Clear all auth data from storage (except remember me credentials)
  const clearAllAuthData = () => {
    console.log('Clearing auth data from storage (preserving remember me)...');
    
    // Save remember me credentials before clearing (support legacy and new)
    const rememberMeData = localStorage.getItem('starline_auth_data') || localStorage.getItem('starnetx_auth_data');
    
    // Clear all Supabase and auth-related keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('sb-') || // Supabase keys
        key.includes('auth') || // Auth-related keys
        key.includes('supabase') || // Supabase keys
        key.includes('session') || // Session keys
        key.includes('token') // Token keys
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log('Removing auth key:', key);
      localStorage.removeItem(key);
    });
    
    // Clear session storage completely
    try {
      sessionStorage.clear();
      console.log('Session storage cleared');
    } catch (error) {
      console.error('Error clearing session storage:', error);
    }
    
    // Restore remember me credentials if they existed
    if (rememberMeData) {
      localStorage.setItem('starline_auth_data', rememberMeData);
      try { localStorage.removeItem('starnetx_auth_data'); } catch {}
    }
  };

  useEffect(() => {
    let mounted = true;

    // Validate Supabase configuration first
    const configValid = validateSupabaseConfig();
    if (!configValid) {
      console.error('Supabase configuration is invalid, auth will likely fail');
    }

    // Get initial session with improved restoration
    const getInitialSession = async () => {
      try {
        console.log('Starting initial auth session check...');
        
        // Try to get existing session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setAuthUser(null);
            setUser(null);
            setLoading(false);
            setInitialAuthCheck(true);
            setSessionLoaded(true);
          }
          return;
        }
        
        if (session?.user) {
          console.log('Found existing session for:', session.user.email);
          
          if (mounted) {
            setAuthUser(session.user);
            setSessionLoaded(true);
            setInitialAuthCheck(true);
            
            // Fetch user profile with better error handling
            try {
              await fetchUserProfile(session.user.id, false);
              console.log('Profile loaded successfully from existing session');
            } catch (profileError) {
              console.warn('Profile fetch failed, using minimal profile:', profileError);
              const minimalProfile = createMinimalUserProfile(session.user);
              setUser(minimalProfile);
              setIsAdmin(false);
            } finally {
              setLoading(false);
            }
          }
        } else {
          console.log('No existing session found');
          if (mounted) {
            setAuthUser(null);
            setUser(null);
            setLoading(false);
            setInitialAuthCheck(true);
            setSessionLoaded(true);
          }
        }
      } catch (error) {
        console.error('Unexpected error in getInitialSession:', error);
        if (mounted) {
          setAuthUser(null);
          setUser(null);
          setLoading(false);
          setInitialAuthCheck(true);
          setSessionLoaded(true);
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);

        // Handle different auth events
        if (event === 'SIGNED_IN') {
          if (session?.user) {
            console.log('User signed in, loading profile...');
            setAuthUser(session.user);
            setSessionLoaded(true);
            setInitialAuthCheck(true);
            
            try {
              await fetchUserProfile(session.user.id, true); // Force refresh on sign in
              console.log('Profile loaded after sign in');
            } catch (profileError) {
              console.warn('Profile fetch failed on sign in:', profileError);
              const minimalProfile = createMinimalUserProfile(session.user);
              setUser(minimalProfile);
              setIsAdmin(false);
            } finally {
              setLoading(false);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed, session maintained');
          // Don't reload profile on token refresh, just ensure auth state is correct
          if (session?.user && !authUser) {
            setAuthUser(session.user);
            setSessionLoaded(true);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setAuthUser(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          setInitialAuthCheck(true);
          setSessionLoaded(true);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setLoading(false);
          setInitialAuthCheck(true);
          setSessionLoaded(true);
        }
      }
    });

    // Start the initial session check
    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Simple session management - clear data on browser close
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored');
    };

    const handleOffline = () => {
      console.log('Network connection lost');
    };

    // Clear data when user closes browser or navigates away
    const handleBeforeUnload = () => {
      console.log('Browser closing/navigating away - clearing session data');
      localStorage.clear();
      sessionStorage.clear();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    const handleOnlineStatusChange = (event: CustomEvent) => {
      if (event.detail?.online && authUser?.id) {
        console.log('App online status changed to:', event.detail.online);
        // Force refresh when coming back online
        if (event.detail.online) {
          void fetchUserProfileWithTimeout(authUser.id, true);
        }
      }
    };
    
    const handleSyncData = () => {
      if (authUser?.id && !isRefreshingSession) {
        console.log('Service worker requested data sync');
        setIsRefreshingSession(true);
        fetchUserProfileWithTimeout(authUser.id, true)
          .finally(() => setIsRefreshingSession(false));
      }
    };

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Add periodic connection health check
  useEffect(() => {
    if (!authUser?.id || !isUserDegraded()) return;
    
    const interval = setInterval(async () => {
      try {
        console.log('Performing periodic connection health check...');
        const connectionOk = await checkSupabaseConnection();
        
        if (connectionOk && isUserDegraded()) {
          console.log('Connection healthy, attempting profile recovery...');
          await recoverUserProfile();
        }
      } catch (error) {
        console.warn('Periodic connection health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [authUser?.id, user]);

  // Session timeout removed - let Supabase handle session management naturally

  const fetchUserProfile = async (userId: string, forceRefresh: boolean = false) => {
    try {
      setProfileLoading(true);
      
      // Add cache-busting for force refresh
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(result => {
          // Force fresh data by adding a timestamp to prevent caching
          if (forceRefresh && result.data) {
            setLastProfileFetch(Date.now());
          }
          return result;
        });

      if (error) {
        // Don't log errors loudly, just throw to be handled by caller
        throw error;
      }

      if (data) {
        console.log('Profile data received:', { id: data.id, email: data.email, role: data.role, timestamp: new Date().toISOString() });
        const userProfile: User = {
          id: data.id,
          email: data.email,
          phone: data.phone || undefined,
          walletBalance: data.wallet_balance || 0,
          referralCode: data.referral_code || '',
          referredBy: data.referred_by || undefined,
          role: data.role || 'user',
          virtualAccountBankName: data.virtual_account_bank_name || undefined,
          virtualAccountNumber: data.virtual_account_number || undefined,
          virtualAccountReference: data.virtual_account_reference || undefined,
          bvn: data.bvn || undefined,
          createdAt: data.created_at,
          firstName: data.first_name || undefined,
          lastName: data.last_name || undefined,
        };
        setUser(userProfile);
        setIsAdmin(data.role === 'admin');
        setLastProfileFetch(Date.now());
        console.log('Profile set successfully at', new Date().toISOString());
        setLoading(false);
      }
    } catch (error) {
      // Re-throw to be handled by caller
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchUserProfileWithTimeout = async (userId: string, forceRefresh: boolean = false) => {
    try {
      setProfileLoading(true);
      
      // Try a quick fetch first (3 seconds)
      const quickTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Quick fetch timeout')), 3000);
      });

      try {
        // Try to fetch profile quickly
        await Promise.race([
          fetchUserProfile(userId, forceRefresh),
          quickTimeoutPromise
        ]);
        return; // Success!
      } catch (quickError) {
        // Quick fetch failed, use minimal profile immediately
        if (authUser) {
          const minimalProfile = createMinimalUserProfile(authUser);
          setUser(minimalProfile);
          setIsAdmin(false);
          setLoading(false); // User can use the app now
          
          // Continue trying to fetch full profile in background (no await)
          fetchUserProfile(userId, forceRefresh).then(() => {
            console.log('Full profile loaded in background');
          }).catch(() => {
            console.log('Background profile fetch failed, continuing with minimal profile');
            // If background still fails, ensure session doesn't linger too long (5 min policy)
            setTimeout(async () => {
              try {
                await supabase.auth.refreshSession();
              } catch {}
            }, 5 * 60 * 1000);
          });
        }
      }
    } catch (error) {
      // This shouldn't happen but handle it anyway
      if (authUser) {
        const minimalProfile = createMinimalUserProfile(authUser);
        setUser(minimalProfile);
        setIsAdmin(false);
      }
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };

  const createMinimalUserProfile = (authUser: AuthUser): User => {
    return {
      id: authUser.id,
      email: authUser.email || '',
      phone: undefined,
      walletBalance: 0,
      referralCode: '',
      referredBy: undefined,
      role: 'user',
      virtualAccountBankName: undefined,
      virtualAccountNumber: undefined,
      virtualAccountReference: undefined,
      bvn: undefined,
      createdAt: authUser.created_at || new Date().toISOString(),
      firstName: undefined,
      lastName: undefined,
    };
  };

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setLoading(false);
        
        // Provide specific error messages based on the error type
        if (error.message?.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
        }
        if (error.message?.includes('Email not confirmed')) {
          return { success: false, error: 'Please verify your email address before logging in.' };
        }
        if (error.message?.includes('Too many requests')) {
          return { success: false, error: 'Too many login attempts. Please wait a few minutes and try again.' };
        }
        if (error.message?.includes('User not found')) {
          return { success: false, error: 'No account found with this email. Please sign up first.' };
        }
        if (error.message?.includes('Network')) {
          return { success: false, error: 'Network error. Please check your internet connection and try again.' };
        }
        
        // Generic error fallback
        return { success: false, error: 'Login failed. Please try again or contact support if the issue persists.' };
      }

      if (data.user) {
        console.log('Login successful:', data.user.email);
        setAuthUser(data.user);
        setSessionLoaded(true);
        setInitialAuthCheck(true);
        
        // Force fresh profile fetch on login
        try {
          await fetchUserProfile(data.user.id, true); // Force refresh on login
          console.log('Profile loaded successfully after login');
        } catch (profileError) {
          console.warn('Profile fetch failed during login, using minimal profile:', profileError);
          const minimalProfile = createMinimalUserProfile(data.user);
          setUser(minimalProfile);
          setIsAdmin(false);
        }
        
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      
      // Handle unexpected errors
      if (error?.message) {
        return { success: false, error: `Login failed: ${error.message}` };
      }
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // First try regular login
      const loginResult = await login(email, password);
      if (!loginResult.success) return false;

      // Check if user is admin after profile is fetched
      // We need to wait a bit for the profile to be fetched
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (user?.role === 'admin') {
        setIsAdmin(true);
        return true;
      }

      // If not admin, logout
      await logout();
      return false;
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, phone?: string, referredBy?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      
      // Check if referral code exists if provided
      let referrerUserId = null;
      if (referredBy && referredBy.trim() !== '') {
        console.log('Checking referral code:', referredBy.toUpperCase());
        
        // Use RPC function to validate referral code (works for anonymous users)
        const { data: referrerId, error: rpcError } = await supabase
          .rpc('validate_referral_code', { code: referredBy });
        
        if (rpcError) {
          console.error('Error calling validate_referral_code RPC:', rpcError);
          // Fallback to direct query if RPC doesn't exist yet
          const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referredBy.toUpperCase())
            .maybeSingle();
          
          if (referrerError && referrerError.code !== 'PGRST116') {
            console.error('Referral code check error:', referrerError);
            return { success: false, error: 'Unable to validate referral code. Please try again.' };
          } else if (!referrer && referrerError?.code !== 'PGRST116') {
            console.error('Referral code not found:', referredBy);
            return { success: false, error: 'Invalid referral code. The code does not exist.' };
          } else if (referrer) {
            console.log('Valid referral code found (fallback method)');
            referrerUserId = referrer.id;
          }
          // If we get PGRST116, we'll let the signup proceed and handle it server-side
        } else if (!referrerId) {
          console.error('Referral code not found:', referredBy);
          return { success: false, error: 'Invalid referral code. The code does not exist.' };
        } else {
          console.log('Valid referral code found for user:', referrerId);
          referrerUserId = referrerId;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone: phone || null,
            referral_code: generateReferralCode(),
            referred_by: referrerUserId || null,
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        // Check for specific error types
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }
        if (error.message?.includes('password')) {
          return { success: false, error: 'Password must be at least 6 characters long.' };
        }
        if (error.message?.includes('email')) {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        return { success: false, error: 'Registration failed. Please try again.' };
      }

      if (data.user) {
        const user = data.user;
        setAuthUser(user);
        // Profile will be created by the trigger, so we wait and then fetch it
        setTimeout(async () => {
          await fetchUserProfile(user.id);
        }, 1000);
        return { success: true };
      }

      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        
        // Provide specific error messages based on the error type
        if (error.message?.includes('Invalid email')) {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        if (error.message?.includes('User not found')) {
          return { success: false, error: 'No account found with this email address.' };
        }
        if (error.message?.includes('Too many requests')) {
          return { success: false, error: 'Too many password reset attempts. Please wait a few minutes and try again.' };
        }
        
        return { success: false, error: 'Failed to send password reset email. Please try again.' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    console.log('Logout clicked - clearing all session data and redirecting...');
    
    // Use the nuclear option - clear everything and redirect
    await clearSessionAndRedirect();
  };

  const updateWalletBalance = async (amount: number): Promise<void> => {
    if (!user) return;

    try {
      const newBalance = user.walletBalance + amount;
      
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating wallet balance:', error);
        return;
      }

      // Update local state
      setUser({ ...user, walletBalance: newBalance });
    } catch (error) {
      console.error('Error updating wallet balance:', error);
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        // Check current session; only logout if no session exists
        const { data: current } = await supabase.auth.getSession();
        if (!current.session) {
          await logout();
        }
        return;
      }
      if (data.session?.user) {
        // Update auth user and fetch profile in background
        setAuthUser(data.session.user);
        void fetchUserProfileWithTimeout(data.session.user.id);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      // Soft-fail: do not immediately logout; check session first
      const { data: current } = await supabase.auth.getSession();
      if (!current.session) {
        await logout();
      }
    }
  };

  const retryProfileFetch = async (): Promise<void> => {
    if (authUser?.id) {
      try {
        await fetchUserProfileWithTimeout(authUser.id);
      } catch (error) {
        console.warn('Retry profile fetch failed:', error);
      }
    }
  };

  const retryProfileFetchWithBackoff = async (maxRetries = 3): Promise<void> => {
    if (!authUser?.id) return;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Profile fetch retry attempt ${attempt}/${maxRetries}`);
        await fetchUserProfile(authUser.id);
        console.log('Profile fetch retry successful');
        return;
      } catch (error) {
        console.warn(`Profile fetch retry attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('All profile fetch retries failed, creating minimal profile');
          const minimalProfile = createMinimalUserProfile(authUser);
          setUser(minimalProfile);
          setIsAdmin(false);
          return;
        }
        
        // Exponential backoff: wait 2^attempt seconds before next retry
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before next retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const checkSupabaseConnection = async (): Promise<boolean> => {
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      const endTime = Date.now();
      
      if (error) {
        console.error('Supabase connection check failed:', error);
        return false;
      }
      
      console.log(`Supabase connection check passed in ${endTime - startTime}ms`);
      return true;
    } catch (error) {
      console.error('Supabase connection check error:', error);
      return false;
    }
  };

  const validateSupabaseConfig = (): boolean => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('Missing Supabase environment variables:', { 
        hasUrl: !!url, 
        hasKey: !!key,
        urlLength: url?.length || 0,
        keyLength: key?.length || 0
      });
      return false;
    }
    
    if (!url.includes('supabase.co')) {
      console.warn('Supabase URL format may be incorrect:', url);
    }
    
    console.log('Supabase configuration validated');
    return true;
  };

  const getErrorMessage = (error: any): string => {
    if (error?.code === 'PGRST116') {
      return 'Permission denied - please contact support';
    } else if (error?.code === '42P01') {
      return 'System configuration error - please contact support';
    } else if (error?.code === 'PGRST301') {
      return 'User profile not found - please contact support';
    } else if (error?.message?.includes('timeout')) {
      return 'Connection timeout - please check your internet connection and try again';
    } else if (error?.message?.includes('fetch')) {
      return 'Network error - please check your internet connection and try again';
    } else {
      return 'An unexpected error occurred - please try again';
    }
  };

  const getDetailedErrorInfo = (error: any) => {
    const baseInfo = {
      message: error?.message || 'Unknown error',
      code: error?.code || 'NO_CODE',
      details: error?.details || 'No details available',
      hint: error?.hint || 'No hint available',
    };
    
    // Add specific error context
    if (error?.code === 'PGRST116') {
      return {
        ...baseInfo,
        userFriendlyMessage: 'Access denied - your account may not have the necessary permissions',
        suggestedAction: 'Please contact support to verify your account permissions',
        severity: 'high' as const,
      };
    } else if (error?.code === '42P01') {
      return {
        ...baseInfo,
        userFriendlyMessage: 'System configuration error - required database table is missing',
        suggestedAction: 'This is a system issue - please contact support immediately',
        severity: 'critical' as const,
      };
    } else if (error?.code === 'PGRST301') {
      return {
        ...baseInfo,
        userFriendlyMessage: 'User profile not found in the system',
        suggestedAction: 'Please contact support to create your user profile',
        severity: 'medium' as const,
      };
    } else if (error?.message?.includes('timeout')) {
      return {
        ...baseInfo,
        userFriendlyMessage: 'Request timed out - the server is taking too long to respond',
        suggestedAction: 'Please check your internet connection and try again',
        severity: 'medium' as const,
      };
    } else if (error?.message?.includes('fetch')) {
      return {
        ...baseInfo,
        userFriendlyMessage: 'Network error - unable to connect to the server',
        suggestedAction: 'Please check your internet connection and try again',
        severity: 'medium' as const,
      };
    } else {
      return {
        ...baseInfo,
        userFriendlyMessage: 'An unexpected error occurred',
        suggestedAction: 'Please try again or contact support if the problem persists',
        severity: 'low' as const,
      };
    }
  };

  // Check if we should show login page - only after session is loaded
  const shouldShowLogin = sessionLoaded && !authUser;

  const isUserDegraded = (): boolean => {
    // User is considered degraded if they have a minimal profile (no referral code, default values)
    return user !== null && (
      user.referralCode === '' ||
      user.walletBalance === 0 ||
      !user.phone ||
      !user.firstName ||
      !user.lastName
    );
  };

  const recoverUserProfile = async (): Promise<boolean> => {
    if (!authUser?.id) return false;
    
    try {
      console.log('Attempting to recover user profile...');
      await fetchUserProfile(authUser.id);
      
      // Check if recovery was successful
      if (user && !isUserDegraded()) {
        console.log('User profile recovery successful');
        return true;
      } else {
        console.warn('User profile recovery failed - still using minimal profile');
        return false;
      }
    } catch (error) {
      console.error('User profile recovery failed:', error);
      return false;
    }
  };

  const getProfileFetchStatus = () => {
    return {
      hasUser: !!user,
      hasAuthUser: !!authUser,
      isDegraded: isUserDegraded(),
      profileLoading,
      loading,
      initialAuthCheck,
      connectionOk: null as boolean | null,
      lastError: null as string | null,
    };
  };

  const diagnoseProfileIssue = async (): Promise<string> => {
    try {
      // Check Supabase connection
      const connectionOk = await checkSupabaseConnection();
      
      if (!connectionOk) {
        return 'Supabase connection failed - check your internet connection and try again';
      }
      
      if (!authUser?.id) {
        return 'No authenticated user found - please log in again';
      }
      
      // Try to fetch profile with detailed error
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authUser.id)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            return 'Permission denied - your account may not have access to the profiles table';
          } else if (error.code === '42P01') {
            return 'System configuration error - profiles table is missing';
          } else if (error.code === 'PGRST301') {
            return 'User profile not found - please contact support to create your profile';
          } else {
            return `Database error: ${error.message}`;
          }
        }
        
        if (!data) {
          return 'Profile exists but no data returned - this may be a system issue';
        }
        
        return 'Profile fetch successful - no issues detected';
      } catch (fetchError: any) {
        return `Profile fetch error: ${fetchError.message || 'Unknown error'}`;
      }
    } catch (error: any) {
      return `Diagnosis failed: ${error.message || 'Unknown error'}`;
    }
  };

  const forceProfileRecovery = async (): Promise<{ success: boolean; message: string }> => {
    if (!authUser?.id) {
      return { success: false, message: 'No authenticated user found' };
    }
    
    try {
      console.log('Force profile recovery initiated...');
      
      // First check connection
      const connectionOk = await checkSupabaseConnection();
      if (!connectionOk) {
        return { success: false, message: 'Cannot connect to server - check your internet connection' };
      }
      
      // Try to fetch profile with multiple retries
      await retryProfileFetchWithBackoff(5);
      
      // Check if recovery was successful
      if (user && !isUserDegraded()) {
        return { success: true, message: 'Profile recovered successfully!' };
      } else {
        return { success: false, message: 'Profile recovery failed - please contact support' };
      }
    } catch (error: any) {
      console.error('Force profile recovery failed:', error);
      return { success: false, message: `Recovery failed: ${error.message || 'Unknown error'}` };
    }
  };

  const getAuthStateSummary = () => {
    return {
      timestamp: new Date().toISOString(),
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        createdAt: authUser.created_at,
        lastSignIn: authUser.last_sign_in_at,
      } : null,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        isDegraded: isUserDegraded(),
        hasWalletBalance: user.walletBalance > 0,
        hasReferralCode: !!user.referralCode,
      } : null,
      loading,
      profileLoading,
      initialAuthCheck,
      isAdmin,
      connectionStatus: 'unknown' as 'unknown' | 'checking' | 'ok' | 'failed',
    };
  };

  return (
    <AuthContext.Provider value={{
      user,
      authUser,
      isAdmin,
      loading,
      profileLoading,
      initialAuthCheck,
      sessionLoaded,
      login,
      adminLogin,
      register,
      resetPassword,
      logout,
      updateWalletBalance,
      refreshProfile: () => user && fetchUserProfile(user.id),
      refreshSession,
      retryProfileFetch,
      retryProfileFetchWithBackoff,
      checkSupabaseConnection,
      validateSupabaseConfig,
      getErrorMessage,
      getDetailedErrorInfo,
      createMinimalUserProfile,
      isUserDegraded,
      recoverUserProfile,
      shouldShowLogin,
      getProfileFetchStatus,
      diagnoseProfileIssue,
      forceProfileRecovery,
      getAuthStateSummary,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get all users (for admin use)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }

    return data.map(profile => ({
      id: profile.id,
      email: profile.email,
      phone: profile.phone || undefined,
      walletBalance: profile.wallet_balance || 0,
      referralCode: profile.referral_code || '',
      referredBy: profile.referred_by || undefined,
      role: profile.role || 'user',
      createdAt: profile.created_at,
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};