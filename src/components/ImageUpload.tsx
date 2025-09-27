'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface ImageUploadProps {
  type: 'header' | 'footer'
  pdfWidth: number
  onUpload: (url: string) => void
  currentImage?: string
}

export default function ImageUpload({ type, pdfWidth, onUpload, currentImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const expectedHeight = type === 'header' ? 300 : 200

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Validate dimensions
    const img = new Image()
    img.onload = async () => {
      if (img.width !== pdfWidth || img.height !== expectedHeight) {
        toast.error(
          `${type} image must be exactly ${pdfWidth} × ${expectedHeight} pixels. Current: ${img.width} × ${img.height}`
        )
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // Upload to Supabase Storage
      await uploadImage(file)
    }
    img.src = URL.createObjectURL(file)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('pdfWidth', pdfWidth.toString())

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onUpload(result.url)
      toast.success(`${type} image uploaded successfully!`)
    } catch (error: any) {
      toast.error(`Failed to upload ${type} image: ${error.message}`)
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {type === 'header' ? 'Header Image' : 'Footer Image'} (Required)
        </label>
        <p className="text-sm text-gray-600 mb-2">
          Must be exactly {pdfWidth} × {expectedHeight} pixels
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {preview ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt={`${type} preview`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                disabled={uploading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium">
                ✓ Image dimensions are correct
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label htmlFor={`${type}-upload`} className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Click to upload {type} image
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </span>
              </label>
              <input
                ref={fileInputRef}
                id={`${type}-upload`}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="sr-only"
                disabled={uploading}
              />
            </div>
          </div>
        )}
      </div>

      {uploading && (
        <div className="text-center">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </div>
        </div>
      )}
    </div>
  )
}
