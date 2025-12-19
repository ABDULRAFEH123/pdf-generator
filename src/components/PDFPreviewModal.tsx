'use client'

import './PDFPreview.css'

interface PDFPreviewModalProps {
  content: string
  presetName: string
  preset: {
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
  onClose: () => void
}

export default function PDFPreviewModal({ content, presetName, preset, onClose }: PDFPreviewModalProps) {
  // Calculate pixel-perfect preview dimensions based on actual PDF size
  // This ensures WYSIWYG - what you see in preview is what you get in PDF
  const PREVIEW_WIDTH = 400 // Larger preview for standalone modal
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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-4">
      <div className="relative mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Preview: {presetName}
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

          {/* Live Preview - Centered */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center">
            <div className="space-y-4 w-full flex flex-col items-center">
              <h4 className="text-sm font-medium text-gray-700 text-center">
                Live Preview <span className="text-xs text-gray-400">(Pixel-perfect)</span>
              </h4>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 shadow-sm p-4">
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
                        No content available...
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
              <div className="bg-gray-50 rounded-lg p-4 w-full max-w-md">
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

          {/* Action Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
