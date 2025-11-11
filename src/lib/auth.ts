import { supabase } from './supabase'
import { User } from '@/types'

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        email_confirm: true
      }
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const getUserProfile = async (userId: string) => {
  try {
    const response = await fetch(`/api/auth/profile?userId=${userId}`)
    const result = await response.json()
    
    if (!response.ok) {
      return { data: null, error: result.error }
    }
    
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to fetch user profile' }
  }
}

