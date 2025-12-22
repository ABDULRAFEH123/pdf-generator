'use client'

// Force dynamic rendering - do not prerender this page
export const dynamic = 'force-dynamic'

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
import ConfirmationModal from '@/components/ConfirmationModal'

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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const [selectedPDFSize, setSelectedPDFSize] = useState<PDFSize | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetWithSize | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<PresetWithSize | null>(null)
  const [deletingPreset, setDeletingPreset] = useState(false)

  // Use React Query hooks for data fetching
  const { data: presetsData, isLoading: presetsLoading, error: presetsError, refetch: refetchPresets } = usePresets(user?.id)
  const { data: pdfsData, isLoading: pdfsLoading, error: pdfsError, refetch: refetchPDFs } = usePDFs(user?.id)
  
  // Handle refetch from query params (after preset creation)
  useEffect(() => {
    if (searchParams?.get('refetch') === 'presets') {
      refetchPresets()
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams, refetchPresets])

  const presets = presetsData?.data || []
  const pdfs = pdfsData?.pdfs || []

  // Get all available sizes from presets
  const availableSizes = Array.from(new Set(presets.map((preset: PresetWithSize) => preset.pdf_sizes.name))).sort()
  
  // Filter presets and PDFs based on active tab
  const filteredPresets = activeTab === 'all' ? presets : presets.filter((preset: PresetWithSize) => preset.pdf_sizes.name === activeTab)
  const filteredPDFs = activeTab === 'all' ? pdfs : pdfs.filter(pdf => pdf.presets.pdf_sizes.name === activeTab)

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
    // Navigate to full-page PDF editor with preset
    router.push(`/dashboard/create-pdf?presetId=${preset.id}`)
  }

  const handleCloseModal = () => {
    setSelectedPreset(null)
    // Refresh PDFs when modal closes (in case a new PDF was created)
    refetchPDFs()
  }

  const handleDeletePDF = (pdfId: string) => {
    // Refresh PDFs data after successful deletion
    refetchPDFs()
    console.log('PDF deleted:', pdfId)
  }

  const handleDeletePreset = (preset: PresetWithSize) => {
    setPresetToDelete(preset)
    setShowDeleteModal(true)
  }

  const handleDeletePresetConfirm = async () => {
    if (!presetToDelete) return

    setDeletingPreset(true)
    try {
      const response = await fetch(`/api/presets/${presetToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete preset')
      }

      toast.success('Preset deleted successfully!')
      setShowDeleteModal(false)
      setPresetToDelete(null)
      
      // Refresh both presets and PDFs data
      refetchPresets()
      refetchPDFs()
    } catch (error) {
      console.error('Delete preset error:', error)
      toast.error('Failed to delete preset')
    } finally {
      setDeletingPreset(false)
    }
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
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">PDF Template Builder</h1>
                <p className="text-blue-100 text-lg">Create professional PDF documents with custom templates</p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{presets.length}</div>
                    <div className="text-sm text-blue-100">Templates</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <PDFSizeSelector onSelect={handleCreatePreset} />
        </div>

        {/* Tabs Navigation */}
        {presets.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>All Sizes</span>
                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                      {presets.length}
                    </span>
                  </div>
                </button>
                
                {availableSizes.map((size : any) => {
                  const sizePresets = presets.filter((preset: PresetWithSize) => preset.pdf_sizes.name === size)
                  const sizePDFs = pdfs.filter((pdf: PDFDocument) => pdf.presets.pdf_sizes.name === size)
                  
                  return (
                    <button
                      key={size}
                      onClick={() => setActiveTab(size)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === size
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          activeTab === size ? 'bg-white' : 'bg-blue-500'
                        }`}></div>
                        <span>{size}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          activeTab === size ? 'bg-white/20' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {sizePresets.length}P/{sizePDFs.length}D
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Presets organized by size */}
        <div className="space-y-8">
          {filteredPresets.length === 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your Presets</h3>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {activeTab === 'all' ? 'No presets' : `No ${activeTab} presets`}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'all' 
                      ? 'Get started by selecting a PDF size above.' 
                      : `Create your first ${activeTab} preset by selecting the size above.`
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Group filtered presets by size
            Object.entries(
              filteredPresets.reduce((acc: any, preset: PresetWithSize) => {
                const sizeName = preset.pdf_sizes.name
                if (!acc[sizeName]) {
                  acc[sizeName] = []
                }
                acc[sizeName].push(preset)
                return acc
              }, {} as Record<string, PresetWithSize[]>)
            ).map(([sizeName, sizePresets]: any) => (
              <div key={sizeName} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-medium text-gray-900">{sizeName} Presets</h3>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {sizePresets.length} preset{sizePresets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {sizePresets[0].pdf_sizes.width} × {sizePresets[0].pdf_sizes.height}px
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sizePresets.map((preset: PresetWithSize) => (
                      <div key={preset.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {preset.name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {preset.pdf_sizes.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">Header</div>
                              <div className="text-xs text-gray-500">{preset.header_height}px height</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">Footer</div>
                              <div className="text-xs text-gray-500">{preset.footer_height}px height</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleCreatePDF(preset)}
                            className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create PDF
                          </button>
                          
                          <button
                            onClick={() => handleDeletePreset(preset)}
                            className="inline-flex items-center justify-center px-3 py-3 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Delete Preset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Generated PDFs Section - Organized by Size */}
        <div className="mt-8 space-y-8">
          {pdfsLoading ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Generated PDFs</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PDFs...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : filteredPDFs.length === 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Generated PDFs</h3>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {activeTab === 'all' ? 'No PDFs generated yet' : `No ${activeTab} PDFs generated yet`}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'all' 
                      ? 'Create your first PDF using one of the presets above.' 
                      : `Create your first ${activeTab} PDF using one of the presets above.`
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Group filtered PDFs by size
            Object.entries(
              filteredPDFs.reduce((acc, pdf) => {
                const sizeName = pdf.presets.pdf_sizes.name
                if (!acc[sizeName]) {
                  acc[sizeName] = []
                }
                acc[sizeName].push(pdf)
                return acc
              }, {} as Record<string, PDFDocument[]>)
            ).map(([sizeName, sizePDFs]) => (
              <div key={sizeName} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="text-lg font-medium text-gray-900">{sizeName} PDFs</h3>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {sizePDFs.length} PDF{sizePDFs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-500">
                        {sizePDFs[0].presets.pdf_sizes.width} × {sizePDFs[0].presets.pdf_sizes.height}px
                      </div>
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
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sizePDFs.map((pdf: PDFDocument) => (
                      <PDFCard key={pdf.id} pdf={pdf} onDelete={handleDeletePDF} />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
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

              {/* Confirmation Modal */}
              <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                  setShowDeleteModal(false)
                  setPresetToDelete(null)
                }}
                onConfirm={handleDeletePresetConfirm}
                title="Delete Preset"
                message={`Are you sure you want to delete "${presetToDelete?.name}"? This action cannot be undone.`}
                confirmText="Yes, Delete"
                cancelText="Cancel"
                isLoading={deletingPreset}
                type="danger"
              />
            </div>
          )
        }
