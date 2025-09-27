'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getPresets } from '@/lib/presets'
import { PDFSize } from '@/types'
import { PDF_SIZES } from '@/lib/constants'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PDFSizeSelector from '@/components/PDFSizeSelector'

interface PresetWithSize {
  id: string
  name: string
  header_image_url: string
  footer_image_url: string
  header_height: number
  footer_height: number
  created_at: string
  pdf_sizes: {
    name: string
    width: number
    height: number
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [presets, setPresets] = useState<PresetWithSize[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPDFSize, setSelectedPDFSize] = useState<PDFSize | null>(null)

  useEffect(() => {
    console.log('Dashboard: User state changed:', user)
    if (!user && !loading) {
      console.log('Dashboard: No user, redirecting to login')
      router.push('/login')
      return
    }
    if (user) {
      loadPresets()
    }
  }, [user, loading, router])

  const loadPresets = async () => {
    if (!user) return

    try {
      const { data, error } = await getPresets(user.id)
      if (error) {
        toast.error('Failed to load presets')
      } else {
        setPresets(data || [])
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePreset = (size: PDFSize) => {
    setSelectedPDFSize(size)
    router.push(`/dashboard/create-preset?size=${size.id}`)
  }

  const handleCreatePDF = (preset: PresetWithSize) => {
    router.push(`/dashboard/create-pdf?presetId=${preset.id}`)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PDF Template Builder</h1>
          <p className="mt-2 text-gray-600">Create and manage your PDF templates</p>
        </div>

        <div className="mb-8">
          <PDFSizeSelector onSelect={handleCreatePreset} />
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Presets</h3>
          </div>
          <div className="p-6">
            {presets.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No presets</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by selecting a PDF size above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {presets.map((preset) => (
                  <div key={preset.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">{preset.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {preset.pdf_sizes.name}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Header: {preset.header_height}px
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Footer: {preset.footer_height}px
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreatePDF(preset)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Create PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
