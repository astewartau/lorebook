import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database table names
export const TABLES = {
  USER_COLLECTIONS: 'user_collections', // Card ID based table (after migration)
  USER_DECKS: 'user_decks',
  USER_BINDERS: 'user_binders',
  USER_PROFILES: 'user_profiles',
} as const

// Card ID based collection type with foil support
export interface UserCollection {
  id: string
  user_id: string
  card_id: number
  quantity_normal: number
  quantity_foil: number
  quantity_total?: number // Generated column
  created_at: string
  updated_at: string
}

export interface UserDeck {
  id: string
  user_id: string
  name: string
  description?: string
  cards: any[] // JSON array of deck cards
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface UserBinder {
  id: string
  user_id: string
  name: string
  description?: string
  binder_type: 'set' | 'custom'
  set_code?: string
  cards: any[] // JSON array for custom binders
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  display_name: string
  full_name?: string
  location?: string
  bio?: string
  avatar_url?: string
  is_public: boolean
  created_at: string
  updated_at: string
}