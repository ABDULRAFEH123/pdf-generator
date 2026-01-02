'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import PDFEditor from '@/components/PDFEditor'
import '@/components/PDFPreview.css'
import { generatePDFFromHTML } from '@/lib/htmlToPdf'
import { transformUnderlineElements } from '@/lib/underlineTransform'

interface PDFData {
  id: string
  content: string
  pdf_name: string
  presets: {
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
}

type ViewMode = 'editor' | 'preview'

function EditPDFContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [pdfData, setPdfData] = useState<PDFData | null>(null)
  const [content, setContent] = useState('')
  const [pdfName, setPdfName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [zoomLevel, setZoomLevel] = useState(59)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pdfId = searchParams.get('id')
    
    if (authLoading) return
    
    if (pdfId && user) {
      loadPDF(pdfId)
    } else if (!authLoading) {
      router.push('/dashboard')
    }
  }, [searchParams, user, authLoading, router])

  const loadPDF = async (pdfId: string) => {
    try {
      const response = await fetch(`/api/pdf/${pdfId}`)
      const result = await response.json()
      
      if (!response.ok || !result.data) {
        console.error('Failed to load PDF:', result.error)
        toast.error('Failed to load PDF')
        router.push('/dashboard')
        return
      }
      
      const data = result.data
      
      // Handle Supabase returning relations as arrays or objects
      const presetData = Array.isArray(data.presets) ? data.presets[0] : data.presets
      if (!presetData || !presetData.pdf_sizes) {
        console.error('Failed to load PDF: Missing preset or pdf_sizes data')
        toast.error('Failed to load PDF')
        router.push('/dashboard')
        return
      }
      
      // Normalize the data structure
      const pdfSizes = Array.isArray(presetData.pdf_sizes) ? presetData.pdf_sizes[0] : presetData.pdf_sizes
      const normalizedData = {
        ...data,
        presets: {
          ...presetData,
          pdf_sizes: pdfSizes
        }
      }
      
      setPdfData(normalizedData as PDFData)
      
      // Debug: Log the original content from database
      console.log('📥 Original content from database:', data.content.substring(0, 500))
      console.log('📥 Content has ql-font classes:', data.content.includes('ql-font-'))
      console.log('📥 Content has style attributes:', data.content.includes('style='))
      
      setContent(data.content)
      setPdfName(data.pdf_name || '')
    } catch (error) {
      console.error('Unexpected error loading PDF:', error)
      toast.error('An unexpected error occurred')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    console.log("clicked")
    if (!content.trim() || !pdfData) {
      toast.error('Please add some content')
      return
    }

    setSaving(true)
    console.log("saved")
    try {
      console.log("try")
      const preset = pdfData.presets
      const finalPdfName = pdfName.trim() || preset.name

      // Debug: Log the content HTML to verify formatting is present
      console.log('📝 Content HTML being saved:', content.substring(0, 500))
      console.log('📝 Content contains ql-font classes:', content.includes('ql-font-'))
      console.log('📝 Content contains style attributes:', content.includes('style='))

      // Step 1: Regenerate PDF with html2canvas to preserve formatting
      console.log('📄 Regenerating PDF with html2canvas...')
      console.log('📄 Preset dimensions:', {
        width: preset.pdf_sizes.width,
        height: preset.pdf_sizes.height,
        headerHeight: preset.header_height,
        footerHeight: preset.footer_height
      })
      
      const pdfBlob = await generatePDFFromHTML({
        content,
        headerImageUrl: preset.header_image_url,
        footerImageUrl: preset.footer_image_url,
        headerHeight: preset.header_height,
        footerHeight: preset.footer_height,
        pdfWidth: preset.pdf_sizes.width,
        pdfHeight: preset.pdf_sizes.height,
        pdfName: finalPdfName
      })
      console.log('✅ PDF regenerated, size:', pdfBlob.size)

      // Step 2: Upload the regenerated PDF
      const formData = new FormData()
      formData.append('pdf', pdfBlob, `${finalPdfName}.pdf`)
      formData.append('pdfId', pdfData.id) // Pass existing PDF ID for update
      formData.append('content', content)
      formData.append('pdfName', finalPdfName)

      console.log('📤 Uploading regenerated PDF...')
      const uploadResponse = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadResult = await uploadResponse.json()
      
      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Failed to upload PDF')
      }

      console.log('✅ PDF updated successfully')
      toast.success('PDF updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save PDF')
    } finally {
      setSaving(false)
    }
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 25))
  const handleZoomReset = () => setZoomLevel(59)

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!pdfData) return null

  const preset = pdfData.presets
  
  // Calculate preview dimensions (matching htmlToPdf.ts exactly)
  const baseWidth = 800
  const aspectRatio = preset.pdf_sizes.height / preset.pdf_sizes.width
  const baseHeight = baseWidth * aspectRatio
  const scaleFactor = baseWidth / preset.pdf_sizes.width
  
  const scaledHeaderHeight = preset.header_height * scaleFactor
  const scaledFooterHeight = preset.footer_height * scaleFactor
  const scaledContentHeight = baseHeight - scaledHeaderHeight - scaledFooterHeight
  
  // Match padding from htmlToPdf.ts - padding is applied at 800px render width, NOT scaled
  const isLetterSize = preset.pdf_sizes.width === 2550 && preset.pdf_sizes.height === 3300
  const horizontalPadding = isLetterSize ? 100 : 60 // Direct px at 800px width
  const verticalPadding = 15 // Direct px at 800px width

  const zoomScale = zoomLevel / 100
  
  // Calculate usable content height per page (excluding padding)
  const usableContentHeight = scaledContentHeight - (verticalPadding * 2)

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Edit: {pdfName || preset.name}</h1>
            <p className="text-xs text-gray-500">
              {preset.pdf_sizes.name} • {preset.pdf_sizes.width} × {preset.pdf_sizes.height}px
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'editor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel - Centered Document Style */}
        {viewMode === 'editor' && (
          <div className="bg-gray-100 flex flex-col w-full overflow-auto">
            <div className="flex-1 flex justify-center py-6 px-4 mt-3">
              <div className="w-full max-w-4xl">
                {/* Document Card */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* PDF Name Input */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">PDF Name</label>
                    <input
                      type="text"
                      value={pdfName}
                      onChange={(e) => setPdfName(e.target.value)}
                      placeholder={preset.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  
                  {/* Content Editor */}
                  <div className="p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <div className="min-h-[500px]">
                      <PDFEditor
                        value={content}
                        onChange={setContent}
                        placeholder="Start typing your PDF content here..."
                        minHeight="500px"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Info Footer */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  {preset.pdf_sizes.name} • {preset.pdf_sizes.width} × {preset.pdf_sizes.height}px
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Panel - Paginated PDF View */}
        {viewMode === 'preview' && (
          <div 
            ref={previewContainerRef}
            className="bg-gray-600 flex flex-col w-full"
          >
            {/* Preview Header with Zoom Controls */}
            <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-medium">
                Live Preview — {preset.pdf_sizes.name}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Zoom Out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded min-w-[50px]"
                >
                  {zoomLevel}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Zoom In"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview Content - Scrollable */}
            <div className="flex-1 overflow-auto p-6 flex justify-center">
              <div 
                className="bg-white shadow-2xl"
                style={{
                  width: `${baseWidth}px`,
                  minHeight: `${baseHeight}px`,
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'top center',
                  marginBottom: `${baseHeight * (zoomScale - 1)}px`
                }}
              >
                {/* Header */}
                <div 
                  className="bg-gray-100 flex items-center justify-center overflow-hidden"
                  style={{ height: `${scaledHeaderHeight}px` }}
                >
                  {preset.header_image_url ? (
                    <img src={preset.header_image_url} alt="Header" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-sm">Header Image ({preset.header_height}px)</span>
                  )}
                </div>

                {/* Content Area */}
                <div 
                  className="bg-white overflow-hidden"
                  style={{ 
                    minHeight: `${scaledContentHeight}px`,
                    padding: `${verticalPadding}px ${horizontalPadding}px`
                  }}
                >
                  {content ? (
                    <div 
                      className="pdf-preview-content"
                      style={{ fontSize: '14px', lineHeight: 1.5, fontFamily: 'Arial, sans-serif' }}
                      dangerouslySetInnerHTML={{ __html: content }}
                      ref={(el) => {
                        if (!el || typeof document === 'undefined') return
                        // Transform underline elements to skip descender characters
                        transformUnderlineElements(el)
                        el.querySelectorAll('ol').forEach((ol) => {
                          const firstLi = ol.querySelector('li')
                          if (firstLi && firstLi.getAttribute('data-list') === 'bullet') {
                            const ul = document.createElement('ul')
                            ul.innerHTML = ol.innerHTML
                            ol.replaceWith(ul)
                          }
                        })
                        el.querySelectorAll('ul').forEach((ul) => {
                          const firstLi = ul.querySelector('li')
                          if (firstLi && firstLi.getAttribute('data-list') === 'ordered') {
                            const ol = document.createElement('ol')
                            ol.innerHTML = ul.innerHTML
                            ul.replaceWith(ol)
                          }
                        })
                      }}
                    />
                  ) : (
                    <div className="text-gray-400 text-center py-8">Your content will appear here...</div>
                  )}
                </div>

                {/* Footer */}
                <div 
                  className="bg-gray-100 flex items-center justify-center overflow-hidden"
                  style={{ height: `${scaledFooterHeight}px` }}
                >
                  {preset.footer_image_url ? (
                    <img src={preset.footer_image_url} alt="Footer" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-sm">Footer Image ({preset.footer_height}px)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Info Bar */}
            <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
              <div className="flex items-center space-x-4">
                <span>{preset.pdf_sizes.name}</span>
                <span>•</span>
                <span>Padding: {horizontalPadding}px</span>
              </div>
              <div className="text-gray-400">Pixel-perfect preview</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EditPDFPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      </div>
    }>
      <EditPDFContent />
    </Suspense>
  )
}
