'use client'

import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      localStorage.clear()
      await signOut()
      toast.success('Signed out successfully!')
      router.push('/')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  if (!user) return null

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              PDF Template Builder
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user.user_metadata?.name || user.email}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
