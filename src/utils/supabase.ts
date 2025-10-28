import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Backward compatibility: seamlessly read old auth key while migrating to new key
const NEW_STORAGE_KEY = 'sb-starline-auth-token';
const OLD_STORAGE_KEY = 'sb-starnetx-auth-token';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    autoRefreshToken: true, // Enable auto-refresh for persistent sessions
    detectSessionInUrl: true,
    storageKey: NEW_STORAGE_KEY, // new standard prefix
    flowType: 'pkce',
    storage: {
      // Use default localStorage with minimal interference
      getItem: (key: string) => {
        // If the new key is requested but not present, fall back to old key once
        const value = localStorage.getItem(key);
        if (!value && key === NEW_STORAGE_KEY) {
          const legacy = localStorage.getItem(OLD_STORAGE_KEY);
          if (legacy) {
            try {
              // Copy forward to new key without deleting legacy
              localStorage.setItem(NEW_STORAGE_KEY, legacy);
              return legacy;
            } catch {
              return legacy;
            }
          }
        }
        return value;
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        // Optionally clean up legacy key if we just wrote the new one
        if (key === NEW_STORAGE_KEY) {
          try { localStorage.removeItem(OLD_STORAGE_KEY); } catch {}
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
      'X-Client-Info': 'starline-networks-pwa',
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
          type: '1-hour' | '2-hour' | '3-hour' | 'daily' | 'weekly' | 'monthly'
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
          type: '1-hour' | '2-hour' | '3-hour' | 'daily' | 'weekly' | 'monthly'
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