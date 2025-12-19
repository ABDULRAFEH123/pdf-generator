'use client'

import { useState, useEffect } from 'react'
import { usePDFGenerationV2 } from '@/hooks/usePDFGenerationV2'
import { toast } from 'react-hot-toast'
import PDFEditor from '@/components/PDFEditor'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import { generatePDFFromHTML } from '@/lib/htmlToPdf'
import './PDFPreview.css'

interface PDFCreationModalProps {
  preset: {
    id: string
    name: string
    header_image_url: string
    footer_image_url: string
    header_height: number
    footer_height: number
    user_id?: string
    pdf_sizes: {
      name: string
      width: number
      height: number
    }
  }
  onClose: () => void
  userId?: string
  initialContent?: string
  initialPdfName?: string
  pdfId?: string
  isEditMode?: boolean
}

export default function PDFCreationModal({ preset, onClose, userId, initialContent = '', initialPdfName = '', pdfId, isEditMode = false }: PDFCreationModalProps) {
  const [content, setContent] = useState(initialContent)
  const [pdfName, setPdfName] = useState(initialPdfName)
  const [mounted, setMounted] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const generatePDFMutation = usePDFGenerationV2()

  // Calculate pixel-perfect preview dimensions based on actual PDF size
  // This ensures WYSIWYG - what you see in preview is what you get in PDF
  const PREVIEW_WIDTH = 350 // Fixed preview width in pixels
  const pdfAspectRatio = preset.pdf_sizes.height / preset.pdf_sizes.width
  const previewHeight = PREVIEW_WIDTH * pdfAspectRatio
  const scaleFactor = PREVIEW_WIDTH / preset.pdf_sizes.width
  
  // Scale header/footer heights proportionally
  const scaledHeaderHeight = preset.header_height * scaleFactor
  const scaledFooterHeight = preset.footer_height * scaleFactor
  const scaledContentHeight = previewHeight - scaledHeaderHeight - scaledFooterHeight
  
  // Match padding from htmlToPdf.ts - Letter size gets extra padding
  const isLetterSize = preset.pdf_sizes.width === 2550 && preset.pdf_sizes.height === 3300
  const basePadding = isLetterSize ? 100 : 60 // Same as htmlToPdf.ts
  const scaledHorizontalPadding = basePadding * scaleFactor
  const scaledVerticalPadding = 15 * scaleFactor // 15px vertical padding from htmlToPdf.ts

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent)
    }
  }, [initialContent])

  useEffect(() => {
    if (initialPdfName) {
      setPdfName(initialPdfName)
    }
  }, [initialPdfName])


  const handleGeneratePDF = async () => {
    if (!content.trim()) {
      toast.error('Please add some content to your PDF')
      return
    }

    if (isEditMode && pdfId) {
      // Update existing PDF - regenerate with html2canvas to preserve formatting
      setSaving(true)
      try {
        const finalPdfName = pdfName.trim() || `PDF - ${preset.name}`
        
        // Step 1: Regenerate PDF with html2canvas to preserve formatting
        console.log('📄 PDFCreationModal: Regenerating PDF with html2canvas...')
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
        formData.append('pdfId', pdfId) // Pass existing PDF ID for update
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
        onClose()
        // Reload the page to refresh the PDF list
        window.location.reload()
      } catch (error) {
        console.error('Update error:', error)
        toast.error('Failed to update PDF')
      } finally {
        setSaving(false)
      }
    } else {
      // Create new PDF using client-side html2canvas approach
      if (!userId) {
        toast.error('User ID is required')
        return
      }

      generatePDFMutation.mutate({
        presetId: preset.id,
        content,
        userId,
        pdfName: pdfName.trim() || `PDF - ${preset.name}`,
        // Pass preset details for client-side generation
        headerImageUrl: preset.header_image_url,
        footerImageUrl: preset.footer_image_url,
        headerHeight: preset.header_height,
        footerHeight: preset.footer_height,
        pdfWidth: preset.pdf_sizes.width,
        pdfHeight: preset.pdf_sizes.height
      }, {
        onSuccess: () => {
          // Close modal after successful generation
          onClose()
        }
      })
    }
  }


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-4">
      <div className="relative mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit PDF' : 'Create PDF'}: {preset.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-scroll">
            {/* Left Side - Content Editor */}
            <div className="space-y-4 flex flex-col">
              {/* PDF Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF Name
                </label>
                <input
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder={`PDF - ${preset.name}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  PDF Content
                </label>
                <div 
                  className="flex-1"
                  onKeyDown={(e) => {
                    console.log('🔑 PDFCreationModal KeyDown:', {
                      key: e.key,
                      keyCode: e.keyCode,
                      target: e.target,
                      currentTarget: e.currentTarget
                    })
                    // Prevent parent scroll container from capturing Enter key
                    if (e.key === 'Enter') {
                      console.log('✅ Enter key detected - stopping propagation')
                      e.stopPropagation()
                    }
                  }}
                >
                  <PDFEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Enter your PDF content here. You can format text, add headings, lists, and more."
                    minHeight="400px"
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Live Preview */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Live Preview <span className="text-xs text-gray-400">(Pixel-perfect)</span></h4>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 shadow-sm flex items-center justify-center p-4">
                {/* PDF Preview Container - Exact aspect ratio */}
                <div 
                  className="relative bg-white shadow-lg"
                  style={{ 
                    width: `${PREVIEW_WIDTH}px`, 
                    height: `${previewHeight}px`,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  {/* Header Image */}
                  <div 
                    className="absolute top-0 left-0 bg-gray-100 flex items-center justify-center overflow-hidden"
                    style={{ 
                      width: `${PREVIEW_WIDTH}px`, 
                      height: `${scaledHeaderHeight}px` 
                    }}
                  >
                    {preset.header_image_url ? (
                      <img 
                        src={preset.header_image_url} 
                        alt="Header" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                          if (nextElement) nextElement.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center" style={{ display: preset.header_image_url ? 'none' : 'flex' }}>
                      <span className="text-xs text-gray-500">Header ({preset.header_height}px)</span>
                    </div>
                  </div>

                  {/* Content Area - Matching exact padding from PDF generation */}
                  <div 
                    className="absolute left-0 bg-white overflow-y-auto"
                    style={{ 
                      width: `${PREVIEW_WIDTH}px`, 
                      top: `${scaledHeaderHeight}px`,
                      height: `${scaledContentHeight}px`,
                      padding: `${scaledVerticalPadding}px ${scaledHorizontalPadding}px`
                    }}
                  >
                    {content ? (
                      <div 
                        className="pdf-preview-content"
                        style={{
                          // Scale font size proportionally for preview
                          fontSize: `${14 * scaleFactor}px`,
                          lineHeight: 1.5
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                        ref={(el) => {
                          if (!el || typeof document === 'undefined' || typeof window === 'undefined') return
                          
                          // FIX: Convert OL to UL when data-list="bullet" and vice versa
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
                      <div className="text-xs text-gray-400 italic text-center mt-4">
                        Your content will appear here...
                      </div>
                    )}
                  </div>

                  {/* Footer Image */}
                  <div 
                    className="absolute bottom-0 left-0 bg-gray-100 flex items-center justify-center overflow-hidden"
                    style={{ 
                      width: `${PREVIEW_WIDTH}px`, 
                      height: `${scaledFooterHeight}px` 
                    }}
                  >
                    {preset.footer_image_url ? (
                      <img 
                        src={preset.footer_image_url} 
                        alt="Footer" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                          if (nextElement) nextElement.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center" style={{ display: preset.footer_image_url ? 'none' : 'flex' }}>
                      <span className="text-xs text-gray-500">Footer ({preset.footer_height}px)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">PDF Details</h5>
                <div className="space-y-1 text-xs text-gray-600">
                  <div><strong>Size:</strong> {preset.pdf_sizes.name} ({preset.pdf_sizes.width} × {preset.pdf_sizes.height}px)</div>
                  <div><strong>Aspect Ratio:</strong> {pdfAspectRatio.toFixed(3)}</div>
                  <div><strong>Header:</strong> {preset.header_height}px height</div>
                  <div><strong>Footer:</strong> {preset.footer_height}px height</div>
                  <div><strong>Content Padding:</strong> {basePadding}px horizontal{isLetterSize ? ' (Letter size)' : ''}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={generatePDFMutation.isPending || saving || !content.trim()}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : generatePDFMutation.isPending ? 'Generating PDF...' : isEditMode ? 'Save Changes' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PDFPreviewModal
          content={content}
          presetName={preset.name}
          preset={{
            header_image_url: preset.header_image_url,
            footer_image_url: preset.footer_image_url,
            header_height: preset.header_height,
            footer_height: preset.footer_height,
            pdf_sizes: preset.pdf_sizes
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
