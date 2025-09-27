import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Extend session to 30 days (in seconds)
    // Default is 1 hour (3600 seconds)
    // 30 days = 30 * 24 * 60 * 60 = 2,592,000 seconds
    // But we'll use a more reasonable 7 days for security
    // 7 days = 7 * 24 * 60 * 60 = 604,800 seconds
    // Actually, let's use 30 days as requested: 2,592,000 seconds
    // Note: This is handled on the Supabase server side, not client side
    // The client configuration here is for session management
  }
})
