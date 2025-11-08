'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import ImageUpload from '@/components/ImageUpload'

function EditPresetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preset, setPreset] = useState<any>(null)
  const [name, setName] = useState('')
  const [headerImage, setHeaderImage] = useState('')
  const [footerImage, setFooterImage] = useState('')

  useEffect(() => {
    const presetId = searchParams.get('id')
    if (!presetId) {
      router.push('/dashboard')
      return
    }

    // Fetch preset data
    const fetchPreset = async () => {
      try {
        const response = await fetch(`/api/presets/${presetId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch preset')
        }
        const data = await response.json()
        setPreset(data)
        setName(data.name)
        setHeaderImage(data.header_image_url)
        setFooterImage(data.footer_image_url)
      } catch (error) {
        console.error('Error fetching preset:', error)
        toast.error('Failed to load preset')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchPreset()
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Please enter a preset name')
      return
    }

    if (!headerImage) {
      toast.error('Please upload a header image')
      return
    }

    if (!footerImage) {
      toast.error('Please upload a footer image')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/presets/${preset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          header_image_url: headerImage,
          footer_image_url: footerImage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update preset')
      }

      toast.success('Preset updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error updating preset:', error)
      toast.error('Failed to update preset')
    } finally {
      setSaving(false)
    }
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

  if (!preset || !user) {
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Preset</h1>
          <p className="mt-1 text-gray-600">
            For {preset.pdf_sizes.name} ({preset.pdf_sizes.width} × {preset.pdf_sizes.height} pixels)
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Preset Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update your preset configuration
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Preset Name
                </label>
                <input
                  type="text"
                  id="preset-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Application Letter, Invoice Template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <ImageUpload
                type="header"
                pdfWidth={preset.pdf_sizes.width}
                onUpload={setHeaderImage}
                currentImage={headerImage}
              />

              <ImageUpload
                type="footer"
                pdfWidth={preset.pdf_sizes.width}
                onUpload={setFooterImage}
                currentImage={footerImage}
              />

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditPresetPage() {
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
      <EditPresetContent />
    </Suspense>
  )
}
