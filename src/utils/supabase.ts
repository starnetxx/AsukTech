import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence for PWA
    autoRefreshToken: true, // Enable auto-refresh for better UX
    detectSessionInUrl: true,
    storageKey: 'starnetx-auth-token',
    storage: {
      // Enhanced storage with better session validation for PWA
      getItem: (key: string) => {
        try {
          const item = localStorage.getItem(key);
          if (!item) return null;
          
          // Try to parse as our custom format first
          try {
            const data = JSON.parse(item);
            
            // Check if this is our custom wrapped format
            if (data.value && data.expiry) {
              const now = new Date().getTime();
              
              // Check if data has expired (30 minutes for PWA)
              if (now > data.expiry) {
                console.log('Session expired, removing from storage');
                localStorage.removeItem(key);
                return null;
              }
              
              return JSON.stringify(data.value);
            }
            
            // If not our format, validate as regular Supabase session
            if (data.access_token && data.expires_at) {
              const expiresAt = data.expires_at * 1000; // Convert to milliseconds
              const now = new Date().getTime();
              
              if (now >= expiresAt) {
                console.log('Access token expired, removing from storage');
                localStorage.removeItem(key);
                return null;
              }
            }
            
            // Return the original item if it's valid
            return item;
          } catch {
            // If parsing fails, return as-is (might be a string token)
            return item;
          }
        } catch (error) {
          console.error('Error reading from storage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          const now = new Date().getTime();
          
          // Try to parse the value to check if it's a session object
          try {
            const parsed = JSON.parse(value);
            
            // If it's a Supabase session, wrap it with our expiry
            if (parsed.access_token) {
              const item = {
                value: parsed,
                expiry: now + (30 * 60 * 1000), // 30 minutes for PWA
                createdAt: now
              };
              localStorage.setItem(key, JSON.stringify(item));
            } else {
              // Store as-is if not a session
              localStorage.setItem(key, value);
            }
          } catch {
            // If can't parse, store as-is
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.error('Error writing to storage:', error);
        }
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'starnetx-pwa',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
  },
})

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          phone: string | null
          wallet_balance: number
          referral_code: string | null
          referred_by: string | null
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          phone?: string | null
          wallet_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          wallet_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          duration: string
          duration_hours: number
          price: number
          data_amount: string
          type: '3-hour' | 'daily' | 'weekly' | 'monthly'
          popular: boolean
          is_unlimited: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          duration: string
          duration_hours: number
          price: number
          data_amount: string
          type: '3-hour' | 'daily' | 'weekly' | 'monthly'
          popular?: boolean
          is_unlimited?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          duration?: string
          duration_hours?: number
          price?: number
          data_amount?: string
          type?: '3-hour' | 'daily' | 'weekly' | 'monthly'
          popular?: boolean
          is_unlimited?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          wifi_name: string
          username: string
          password: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          wifi_name: string
          username: string
          password: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          wifi_name?: string
          username?: string
          password?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      credential_pools: {
        Row: {
          id: string
          location_id: string
          plan_id: string
          username: string
          password: string
          status: 'available' | 'used' | 'disabled'
          assigned_to: string | null
          assigned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          plan_id: string
          username: string
          password: string
          status?: 'available' | 'used' | 'disabled'
          assigned_to?: string | null
          assigned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          plan_id?: string
          username?: string
          password?: string
          status?: 'available' | 'used' | 'disabled'
          assigned_to?: string | null
          assigned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          location_id: string | null
          credential_id: string | null
          amount: number
          type: 'wallet_topup' | 'plan_purchase' | 'wallet_funding'
          status: 'pending' | 'completed' | 'failed' | 'success'
          reference?: string
          flutterwave_reference?: string
          flutterwave_tx_ref?: string
          payment_method?: string
          details?: any
          metadata?: any
          mikrotik_username: string | null
          mikrotik_password: string | null
          expires_at: string | null
          purchase_date: string | null
          activation_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          location_id?: string | null
          credential_id?: string | null
          amount: number
          type: 'wallet_topup' | 'plan_purchase' | 'wallet_funding'
          status?: 'pending' | 'completed' | 'failed' | 'success'
          reference?: string
          flutterwave_reference?: string
          flutterwave_tx_ref?: string
          payment_method?: string
          details?: any
          metadata?: any
          mikrotik_username?: string | null
          mikrotik_password?: string | null
          expires_at?: string | null
          purchase_date?: string | null
          activation_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          location_id?: string | null
          credential_id?: string | null
          amount?: number
          type?: 'wallet_topup' | 'plan_purchase' | 'wallet_funding'
          status?: 'pending' | 'completed' | 'failed' | 'success'
          reference?: string
          flutterwave_reference?: string
          flutterwave_tx_ref?: string
          payment_method?: string
          details?: any
          metadata?: any
          mikrotik_username?: string | null
          mikrotik_password?: string | null
          expires_at?: string | null
          purchase_date?: string | null
          activation_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}