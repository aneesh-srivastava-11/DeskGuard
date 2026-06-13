import { createClient } from '@supabase/supabase-js'

// Fall back to placeholder values when env vars are not yet configured,
// so the app renders in UI-only mode without crashing.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const IS_SUPABASE_CONFIGURED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Client-side Supabase instance (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
