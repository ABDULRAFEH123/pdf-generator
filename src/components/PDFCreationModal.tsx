'use client'

import { useState } from 'react'
import { generatePDF } from '@/lib/pdfGenerator'
import { toast } from 'react-hot-toast'
import RichTextEditor from './RichTextEditor'

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
}

export default function PDFCreationModal({ preset, onClose }: PDFCreationModalProps) {
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    if (!content.trim()) {
      toast.error('Please add some content to your PDF')
      return
    }

    setGenerating(true)

    try {
      await generatePDF(
        preset.id,
        content,
        preset.user_id || 'current-user' // You'll need to pass the user ID
      )
      toast.success('PDF generated successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Create PDF: {preset.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Enter your PDF content here. You can format text, add lists, links, and more."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
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
  )
}
