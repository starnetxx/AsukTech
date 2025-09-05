// PWA-specific utilities for cache and session management

/**
 * Clear all cached data and force a fresh start
 * Useful when user data appears stale or corrupted
 */
export const clearPWACache = async () => {
  console.log('Clearing PWA cache...');
  
  // Clear service worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }
  
  // Clear localStorage except for remember me data (support legacy and new)
  const rememberMeData = localStorage.getItem('starline_auth_data') || localStorage.getItem('starnetx_auth_data');
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key !== 'starline_auth_data' && key !== 'starnetx_auth_data') {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Restore remember me data if it existed
  if (rememberMeData) {
    localStorage.setItem('starline_auth_data', rememberMeData);
    try { localStorage.removeItem('starnetx_auth_data'); } catch {}
  }
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear IndexedDB if used
  if ('indexedDB' in window) {
    const databases = await indexedDB.databases?.() || [];
    await Promise.all(
      databases.map(db => {
        if (db.name) {
          console.log('Deleting IndexedDB:', db.name);
          return indexedDB.deleteDatabase(db.name);
        }
      })
    );
  }
  
  console.log('PWA cache cleared successfully');
};

/**
 * Force refresh the service worker
 */
export const updateServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('Checking for service worker updates...');
      await registration.update();
      
      // If there's a waiting worker, activate it
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Reload the page to use the new service worker
        window.location.reload();
      }
    }
  }
};

/**
 * Check if the app is running as a PWA
 */
export const isPWA = () => {
  // Check if app is running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check if it's running from home screen on iOS
  const isIOSPWA = ('standalone' in navigator) && (navigator as any).standalone;
  
  // Check if it's in a TWA (Trusted Web Activity) on Android
  const isTWA = document.referrer.includes('android-app://');
  
  return isStandalone || isIOSPWA || isTWA;
};

/**
 * Get PWA installation status
 */
export const getPWAStatus = () => {
  return {
    isPWA: isPWA(),
    hasServiceWorker: 'serviceWorker' in navigator,
    isOnline: navigator.onLine,
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent,
  };
};

/**
 * Request notification permission for PWA
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};

/**
 * Show a notification (if permissions are granted)
 */
export const showNotification = async (title: string, options?: NotificationOptions) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          icon: '/favicon.png',
          badge: '/favicon.png',
          ...options
        });
        return true;
      }
    }
    
    // Fallback to regular notification if service worker not available
    new Notification(title, {
      icon: '/favicon.png',
      ...options
    });
    return true;
  }
  return false;
};

/**
 * Force clear auth session and reload
 */
export const forceLogoutAndClear = async () => {
  console.log('Force logout and clear initiated...');
  
  // Clear all caches
  await clearPWACache();
  
  // Unregister service worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }
  
  // Reload the page
  window.location.href = '/';
};

/**
 * Clear all app data and cookies unconditionally (used on hard refresh)
 */
export const clearAllAppDataAndCookies = async () => {
  try {
    // Clear caches
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }

    // Clear storages
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}

    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
    });
  } catch (e) {
    console.warn('clearAllAppDataAndCookies warning:', e);
  }
};

/**
 * Clear all app data and cookies but preserve remember me data
 */
export const clearAllAppDataAndCookiesPreservingRememberMe = async () => {
  try {
    // Save remember me data before clearing
    const rememberMeData = localStorage.getItem('starline_auth_data') || localStorage.getItem('starnetx_auth_data');
    
    // Clear caches
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }

    // Clear storages
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}

    // Restore remember me data if it existed
    if (rememberMeData) {
      localStorage.setItem('starline_auth_data', rememberMeData);
      console.log('Remember me data preserved during logout');
    }

    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
    });
  } catch (e) {
    console.warn('clearAllAppDataAndCookiesPreservingRememberMe warning:', e);
  }
};

/**
 * Validate session freshness
 */
export const isSessionFresh = (lastUpdate: number, maxAgeMinutes: number = 30): boolean => {
  const now = Date.now();
  const ageInMinutes = (now - lastUpdate) / (1000 * 60);
  return ageInMinutes < maxAgeMinutes;
};

/**
 * Debug function to log all storage data
 */
export const debugStorage = () => {
  console.group('🔍 PWA Storage Debug');
  
  console.log('LocalStorage:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
    }
  }
  
  console.log('\nSessionStorage:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const value = sessionStorage.getItem(key);
      console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
    }
  }
  
  console.log('\nPWA Status:', getPWAStatus());
  
  console.groupEnd();
};

// Auto-clear stale sessions on app start
export const initPWASessionManagement = () => {
  // Check and clear stale auth data on startup
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth')
  );
  
  authKeys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        
        // Check various expiry formats
        if (parsed.expires_at) {
          const expiresAt = new Date(parsed.expires_at * 1000);
          if (expiresAt < new Date()) {
            console.log('Removing expired session:', key);
            localStorage.removeItem(key);
          }
        }
        
        if (parsed.expiry) {
          if (parsed.expiry < Date.now()) {
            console.log('Removing expired custom session:', key);
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      // Invalid JSON, might be corrupted
      console.log('Removing invalid session data:', key);
      localStorage.removeItem(key);
    }
  });
  
  // Set up periodic cleanup (every 5 minutes)
  setInterval(() => {
    initPWASessionManagement();
  }, 5 * 60 * 1000);
};

// Export a function to be called when the app detects stale data
export const handleStaleDataDetected = async () => {
  console.warn('Stale data detected, initiating recovery...');
  
  // Clear service worker cache
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      // Send message to service worker to clear cache
      const messageChannel = new MessageChannel();
      
      return new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_REFRESHED') {
            console.log('Cache refreshed successfully');
            resolve();
          }
        };
        
        navigator.serviceWorker.controller?.postMessage(
          { type: 'FORCE_REFRESH' },
          [messageChannel.port2]
        );
        
        // Timeout after 3 seconds
        setTimeout(resolve, 3000);
      });
    }
  }
};