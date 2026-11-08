import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: copy .env.example to .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'lorebook-auth',
    storage: window.localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce',
    autoRefreshToken: true,
  },
})

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']

/** SQLSTATE raised by save_deck_cards / save_binder_cards when the row changed elsewhere. */
export const VERSION_CONFLICT = 'LB409'
