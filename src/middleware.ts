import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Temporarily disable middleware completely to avoid any conflicts
  // We'll handle auth protection in the components themselves
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match only dashboard routes to avoid interfering with other requests
     */
    '/dashboard/:path*',
  ],
}
