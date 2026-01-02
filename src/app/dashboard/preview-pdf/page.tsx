'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import '@/components/PDFPreview.css'
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

function PreviewPDFContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [pdfData, setPdfData] = useState<PDFData | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(59)
  const [downloading, setDownloading] = useState(false)

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
    } catch (error) {
      console.error('Unexpected error loading PDF:', error)
      toast.error('An unexpected error occurred')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!pdfData) return
    
    setDownloading(true)
    try {
      const response = await fetch(`/api/pdf/${pdfData.id}/download`)
      if (!response.ok) throw new Error('Failed to download PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const displayName = pdfData.pdf_name || pdfData.presets.name
      link.download = `${displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 25))
  const handleZoomReset = () => setZoomLevel(59)

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading preview...</p>
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

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Header Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-gray-300 hover:text-white"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-6 w-px bg-gray-600"></div>
          <div>
            <h1 className="text-lg font-semibold text-white">{pdfData.pdf_name || preset.name}</h1>
            <p className="text-xs text-gray-400">
              {preset.pdf_sizes.name} • {preset.pdf_sizes.width} × {preset.pdf_sizes.height}px
            </p>
          </div>
        </div>

        {/* Zoom Controls - Center */}
        <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-600 rounded text-gray-300 hover:text-white"
            title="Zoom Out (−)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-600 rounded min-w-[60px]"
          >
            {zoomLevel}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-600 rounded text-gray-300 hover:text-white"
            title="Zoom In (+)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Content - Full screen scrollable */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
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
            <div 
              className="pdf-preview-content"
              style={{ fontSize: '14px', lineHeight: 1.5, fontFamily: 'Arial, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: pdfData.content }}
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

      {/* Bottom Info Bar */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-xs flex-shrink-0 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <span>Size: {preset.pdf_sizes.name}</span>
          <span>•</span>
          <span>{preset.pdf_sizes.width} × {preset.pdf_sizes.height}px</span>
          <span>•</span>
          <span>Header: {preset.header_height}px</span>
          <span>•</span>
          <span>Footer: {preset.footer_height}px</span>
          <span>•</span>
          <span>Padding: {horizontalPadding}px {isLetterSize ? '(Letter extra)' : ''}</span>
        </div>
        <div className="text-gray-400">
          Press +/− to zoom • Click percentage to reset
        </div>
      </div>
    </div>
  )
}

export default function PreviewPDFPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    }>
      <PreviewPDFContent />
    </Suspense>
  )
}
