'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePresets } from '@/hooks/usePresets'
import { usePDFs } from '@/hooks/usePDFs'
import { PDFSize } from '@/types'
import { PDF_SIZES } from '@/lib/constants'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PDFSizeSelector from '@/components/PDFSizeSelector'
import PDFCreationModal from '@/components/PDFCreationModal'
import PDFCard from '@/components/PDFCard'

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

interface PDFDocument {
  id: string
  content: string
  created_at: string
  presets: {
    name: string
    header_image_url: string
    footer_image_url: string
    header_height: number
    footer_height: number
    pdf_sizes: {
      name: string
      width: number
      height: number
    }
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedPDFSize, setSelectedPDFSize] = useState<PDFSize | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetWithSize | null>(null)

  // Use React Query hooks for data fetching
  const { data: presetsData, isLoading: presetsLoading, error: presetsError } = usePresets(user?.id)
  const { data: pdfsData, isLoading: pdfsLoading, error: pdfsError, refetch: refetchPDFs } = usePDFs(user?.id)

  const presets = presetsData?.data || []
  const pdfs = pdfsData?.pdfs || []

  // useEffect(() => {
  //   // If no user after auth check, redirect to login
  //   if (!user && !presetsLoading) {
  //     router.push('/login')
  //   }
  // }, [user, presetsLoading, router])

  // Handle errors
  useEffect(() => {
    if (presetsError) {
      console.error('Error loading presets:', presetsError)
      toast.error('Failed to load presets')
    }
  }, [presetsError])

  useEffect(() => {
    if (pdfsError) {
      console.error('Error loading PDFs:', pdfsError)
      toast.error('Failed to load PDFs')
    }
  }, [pdfsError])

  const handleCreatePreset = (size: PDFSize) => {
    setSelectedPDFSize(size)
    router.push(`/dashboard/create-preset?size=${size.id}`)
  }

  const handleCreatePDF = (preset: PresetWithSize) => {
    setSelectedPreset(preset)
  }

  const handleCloseModal = () => {
    setSelectedPreset(null)
    // Refresh PDFs when modal closes (in case a new PDF was created)
    refetchPDFs()
  }

  // Show loading while checking auth state or loading data
  if (presetsLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no user after loading, show nothing (redirect will happen)
  // if (!user) {
  //   return null
  // }

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
                {presets.map((preset: PresetWithSize) => (
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

        {/* Generated PDFs Section */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Generated PDFs</h3>
              <button
                onClick={() => refetchPDFs()}
                disabled={pdfsLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {pdfsLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-6">
            {pdfsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading PDFs...</p>
                </div>
              </div>
            ) : pdfs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No PDFs generated yet</h3>
                <p className="mt-1 text-sm text-gray-500">Create your first PDF using one of the presets above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pdfs.map((pdf: PDFDocument) => (
                  <PDFCard key={pdf.id} pdf={pdf} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Creation Modal */}
      {selectedPreset && (
        <PDFCreationModal
          preset={selectedPreset}
          onClose={handleCloseModal}
          userId={user?.id}
        />
      )}
    </div>
  )
}
