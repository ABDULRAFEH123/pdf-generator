import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return NextResponse.json({
        authenticated: false,
        error: sessionError.message
      })
    }

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found'
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at
      },
      session: {
        expires_at: session.expires_at,
        refresh_token: session.refresh_token ? 'present' : 'missing'
      }
    })
  } catch (error) {
    console.error('Session test error:', error)
    return NextResponse.json({
      authenticated: false,
      error: 'Internal server error'
    })
  }
}
