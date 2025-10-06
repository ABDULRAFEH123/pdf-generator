'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { PDFSize } from '@/types'
import { PDF_SIZES } from '@/lib/constants'
import PresetForm from '@/components/PresetForm'

function CreatePresetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [selectedPDFSize, setSelectedPDFSize] = useState<PDFSize | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sizeId = searchParams.get('size')
    if (sizeId) {
      const size = PDF_SIZES.find(s => s.id === sizeId)
      if (size) {
        setSelectedPDFSize(size)
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }, [searchParams, router])

  const handleSuccess = () => {
    router.push('/dashboard')
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  if (loading) {
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

  if (!selectedPDFSize || !user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
          <h1 className="text-2xl font-bold text-gray-900">Create New Preset</h1>
          <p className="mt-1 text-gray-600">
            For {selectedPDFSize.name} ({selectedPDFSize.width} × {selectedPDFSize.height} pixels)
          </p>
        </div>

        <PresetForm
          pdfSize={selectedPDFSize}
          userId={user.id}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}

export default function CreatePresetPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    }>
      <CreatePresetContent />
    </Suspense>
  )
}
