'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import ConfirmationModal from './ConfirmationModal'

interface PDFCardProps {
  pdf: {
    id: string
    content: string
    created_at: string
    pdf_name?: string
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
  onDelete?: (pdfId: string) => void
}

export default function PDFCard({ pdf, onDelete }: PDFCardProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
      const displayName = pdf.pdf_name || pdf.presets.name
      link.download = `${displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(pdf.created_at).getTime()}.pdf`
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

  const handleDeleteClick = () => {
    if (!onDelete) return
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!onDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/pdf/${pdf.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete PDF')
      }

      toast.success('PDF deleted successfully!')
      onDelete(pdf.id) // This will trigger the parent to refresh data
      setShowDeleteModal(false)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete PDF')
    } finally {
      setDeleting(false)
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

  const decodeHTMLEntities = (text: string): string => {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    }
    
    let decoded = text
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char)
    }
    
    // Replace numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10))
    })
    
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    
    return decoded
  }

  const getContentPreview = (content: string) => {
    // Remove HTML tags and decode entities
    const textContent = decodeHTMLEntities(content.replace(/<[^>]*>/g, '').trim())
    return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent
  }

  return (
    <div className="group bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-100 transition-colors">
                {pdf.pdf_name || pdf.presets.name}
              </h3>
              <div className="flex items-center space-x-3 text-blue-100">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">{pdf.presets.pdf_sizes.name}</span>
                </div>
                <div className="w-1 h-1 bg-blue-200 rounded-full"></div>
                <span className="text-sm">{formatDate(pdf.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white border border-white/30">
                PDF
              </span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      <div className="p-6">
        {/* Content Preview */}


        {/* PDF Details with Icons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Dimensions</div>
                <div className="text-sm font-semibold text-gray-900">
                  {pdf.presets.pdf_sizes.width} × {pdf.presets.pdf_sizes.height}px
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-medium text-purple-600 uppercase tracking-wide">Header</div>
                <div className="text-sm font-semibold text-gray-900">{pdf.presets.header_height}px</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Edit and Preview Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push(`/dashboard/edit-pdf?id=${pdf.id}`)}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-green-300 text-sm font-medium rounded-xl text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => router.push(`/dashboard/preview-pdf?id=${pdf.id}`)}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-blue-300 text-sm font-medium rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
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
            
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="inline-flex items-center justify-center px-4 py-3 border border-red-300 text-sm font-medium rounded-xl text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 font-mono">
              ID: {pdf.id.substring(0, 8)}...
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Generated</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete PDF"
        message={`Are you sure you want to delete "${pdf.presets.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={deleting}
        type="danger"
      />
    </div>
  )
}
