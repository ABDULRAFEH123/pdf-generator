import { supabase } from './supabase'
import { User } from '@/types'

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  // First try to sign in normally
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // If there's an error about email not confirmed, try to update the user
  if (error?.message?.includes('not confirmed')) {
    // Get the user from auth.users using the admin client
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    const user = users?.find(u => u.email === email)

    if (user) {
      // Update the user to confirmed using the admin client
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      })
      
      if (!updateError) {
        // Try to sign in again
        return await supabase.auth.signInWithPassword({
          email,
          password,
        })
      }
    }
  }

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

