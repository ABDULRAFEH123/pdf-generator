'use client'

import { PDFSize } from '@/types'
import { PDF_SIZES } from '@/lib/constants'

interface PDFSizeSelectorProps {
  onSelect: (size: PDFSize) => void
  selectedSize?: PDFSize
}

export default function PDFSizeSelector({ onSelect, selectedSize }: PDFSizeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select PDF Standard Size
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the PDF size to ensure your header and footer images are properly sized.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PDF_SIZES.map((size) => (
          <div
            key={size.id}
            onClick={() => onSelect(size)}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${
              selectedSize?.id === size.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{size.name}</h4>
                <p className="text-sm text-gray-600">{size.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {size.width} × {size.height} pixels
                </p>
              </div>
              {selectedSize?.id === size.id && (
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {selectedSize && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">
                {selectedSize.name} Selected
              </h4>
              <p className="text-sm text-green-700 mt-1">
                Your header and footer images will be sized for {selectedSize.name} ({selectedSize.width} × {selectedSize.height} pixels).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
