'use client'

import { useState } from 'react'
import './PDFPreview.css'

interface PDFPreviewModalProps {
  content: string
  presetName: string
  onClose: () => void
}

export default function PDFPreviewModal({ content, presetName, onClose }: PDFPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Preview: {presetName}
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
    

            <div className="bg-white border rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Rendered Preview</h4>
              <div 
                className="pdf-preview-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
