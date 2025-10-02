'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import PDFPreviewModal from './PDFPreviewModal'

interface PDFCardProps {
  pdf: {
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
}

export default function PDFCard({ pdf }: PDFCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      console.log('\n=== PDF DOWNLOAD REQUEST DEBUG ===')
      console.log('PDF ID:', pdf.id)
      console.log('PDF Content:', pdf.content)
      console.log('PDF Content Length:', pdf.content?.length || 0)
      console.log('Preset Name:', pdf.presets?.name)
      console.log('Created At:', pdf.created_at)
      
      const response = await fetch(`/api/pdf/${pdf.id}/download`)
      console.log('Response:', response)
      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }
      console.log('Response ok')
      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${pdf.presets.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(pdf.created_at).getTime()}.pdf`
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getContentPreview = (content: string) => {
    // Remove HTML tags and get first 100 characters
    const textContent = content.replace(/<[^>]*>/g, '').trim()
    return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {pdf.presets.name}
            </h3>
            <p className="text-sm text-gray-500">
              {pdf.presets.pdf_sizes.name} • {formatDate(pdf.created_at)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              PDF
            </span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {getContentPreview(pdf.content)}
          </p>
        </div>

        {/* PDF Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">Size:</span> {pdf.presets.pdf_sizes.width} × {pdf.presets.pdf_sizes.height}px
          </div>
          <div>
            <span className="font-medium">Header:</span> {pdf.presets.header_height}px
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
          
          <div className="text-xs text-gray-400">
            ID: {pdf.id.substring(0, 8)}...
          </div>
        </div>
      </div>
      
      {/* Preview Modal */}
      {showPreview && (
        <PDFPreviewModal
          content={pdf.content}
          presetName={pdf.presets.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
