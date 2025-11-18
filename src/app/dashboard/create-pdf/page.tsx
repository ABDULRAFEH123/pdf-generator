'use client'

// Force dynamic rendering - do not prerender this page
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getPreset } from '@/lib/presets'
import { generatePDF } from '@/lib/pdfGenerator'
import { toast } from 'react-hot-toast'
import PDFEditor from '@/components/PDFEditor'

interface PresetWithSize {
  id: string
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

function CreatePDFContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [preset, setPreset] = useState<PresetWithSize | null>(null)
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generatedPdfId, setGeneratedPdfId] = useState<string | null>(null)

  useEffect(() => {
    const presetId = searchParams.get('presetId')
    
    // Don't redirect if we're still loading the user
    if (authLoading) {
      return
    }
    
    if (presetId && user) {
      loadPreset(presetId)
    } else if (!authLoading) {
      router.push('/dashboard')
    }
  }, [searchParams, user, authLoading, router])

  const loadPreset = async (presetId: string) => {
    try {
      const { data, error } = await getPreset(presetId)
      
      if (error) {
        console.error('Failed to load preset:', error)
        toast.error(`Failed to load preset: ${error}`)
        router.push('/dashboard')
      } else {
        setPreset(data)
      }
    } catch (error) {
      console.error('Unexpected error loading preset:', error)
      toast.error('An unexpected error occurred')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!content.trim()) {
      toast.error('Please add some content to your PDF')
      return
    }

    if (!preset || !user) return

    setGenerating(true)

    try {
      const result = await generatePDF(preset.id, content, user.id)
      
      if (result.success && result.pdfId) {
        toast.success('PDF generated and saved successfully!')
        setGeneratedPdfId(result.pdfId)
      } else {
        toast.error(result.error || 'Failed to generate PDF')
      }
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  if (authLoading || loading) {
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

  if (!preset) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create PDF: {preset.name}</h1>
          <p className="mt-1 text-gray-600">
            {preset.pdf_sizes.name} ({preset.pdf_sizes.width} × {preset.pdf_sizes.height} pixels)
          </p>
        </div>

        <div className="bg-white shadow rounded-lg flex flex-col h-[calc(100vh-200px)]">
          <div className="p-6 flex-1 flex flex-col overflow-hidden">
            <div className="mb-6 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Preview Layout</h4>
                <div className="space-y-2">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-xs text-gray-600 mb-1">Header ({preset.pdf_sizes.width} × {preset.header_height}px)</div>
                    <div className="h-8 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">Header Image</span>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-xs text-gray-600 mb-1">Content Area</div>
                    <div className="h-16 bg-blue-50 rounded flex items-center justify-center">
                      <span className="text-xs text-blue-600">Your Content Here</span>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-xs text-gray-600 mb-1">Footer ({preset.pdf_sizes.width} × {preset.footer_height}px)</div>
                    <div className="h-6 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">Footer Image</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                PDF Content
              </label>
              <div className="flex-1">
                <PDFEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Enter your PDF content here. You can format text, add lists, and more."
                  minHeight="400px"
                />
              </div>
            </div>

            {/* Success Message */}
            {generatedPdfId && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex-shrink-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      PDF Generated Successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your PDF has been saved and is ready to download.</p>
                    </div>
                    <div className="mt-3">
                      <a
                        href={`/api/pdf/${generatedPdfId}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 flex-shrink-0">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={generating || !content.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating PDF...' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreatePDFPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    }>
      <CreatePDFContent />
    </Suspense>
  )
}
