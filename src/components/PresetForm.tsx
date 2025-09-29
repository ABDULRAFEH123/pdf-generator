'use client'

import { useState } from 'react'
import { createPreset } from '@/lib/presets'
import { PDFSize } from '@/types'
import { toast } from 'react-hot-toast'
import ImageUpload from './ImageUpload'

interface PresetFormProps {
  pdfSize: PDFSize
  userId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PresetForm({ pdfSize, userId, onSuccess, onCancel }: PresetFormProps) {
  const [name, setName] = useState('')
  const [headerImage, setHeaderImage] = useState('')
  const [footerImage, setFooterImage] = useState('')
  const [loading, setLoading] = useState(false)

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

    setLoading(true)

    try {
      const { error } = await createPreset({
        name: name.trim(),
        pdf_size_id: pdfSize.id,
        header_image_url: headerImage,
        footer_image_url: footerImage,
        header_height: 300,
        footer_height: 300,
        user_id: userId
      })

      if (error) {
        toast.error('Failed to create preset')
      } else {
        toast.success('Preset created successfully!')
        onSuccess()
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Create New Preset</h3>
          <p className="text-sm text-gray-600 mt-1">
            For {pdfSize.name} ({pdfSize.width} × {pdfSize.height} pixels)
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
            pdfWidth={pdfSize.width}
            onUpload={setHeaderImage}
          />

          <ImageUpload
            type="footer"
            pdfWidth={pdfSize.width}
            onUpload={setFooterImage}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !headerImage || !footerImage}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
