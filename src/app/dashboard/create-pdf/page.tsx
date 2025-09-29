'use client'

import { useState, useEffect } from 'react'
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

export default function CreatePDFPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [preset, setPreset] = useState<PresetWithSize | null>(null)
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const presetId = searchParams.get('presetId')
    console.log('Create PDF page - presetId:', presetId, 'user:', user?.id, 'authLoading:', authLoading)
    
    // Don't redirect if we're still loading the user
    if (authLoading) {
      console.log('Still loading user, waiting...')
      return
    }
    
    if (presetId && user) {
      loadPreset(presetId)
    } else if (!authLoading) {
      console.log('Missing presetId or user after loading, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [searchParams, user, authLoading, router])

  const loadPreset = async (presetId: string) => {
    try {
      console.log('Loading preset with ID:', presetId)
      const { data, error } = await getPreset(presetId)
      console.log('Preset data:', data, 'Error:', error)
      
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
      await generatePDF(preset.id, content, user.id)
      toast.success('PDF generated successfully!')
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

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="mb-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF Content
                </label>
                <PDFEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Enter your PDF content here. You can format text, add lists, and more."
                  minHeight="400px"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
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
