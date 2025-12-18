import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check if buckets exist
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json({
        success: false,
        error: `Failed to list buckets: ${listError.message}`
      })
    }

    const results: { bucket: string; status: string }[] = []

    // Setup pdf-images bucket (for header/footer images)
    const pdfImagesBucketExists = buckets?.some(bucket => bucket.name === 'pdf-images')
    
    if (pdfImagesBucketExists) {
      results.push({ bucket: 'pdf-images', status: 'already exists' })
    } else {
      const { error } = await supabaseAdmin.storage.createBucket('pdf-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })
      if (error) {
        results.push({ bucket: 'pdf-images', status: `failed: ${error.message}` })
      } else {
        results.push({ bucket: 'pdf-images', status: 'created' })
      }
    }

    // Setup pdfs bucket (for generated PDF files)
    const pdfsBucketExists = buckets?.some(bucket => bucket.name === 'pdfs')
    
    if (pdfsBucketExists) {
      results.push({ bucket: 'pdfs', status: 'already exists' })
    } else {
      const { error } = await supabaseAdmin.storage.createBucket('pdfs', {
        public: true,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 52428800 // 50MB for PDFs
      })
      if (error) {
        results.push({ bucket: 'pdfs', status: `failed: ${error.message}` })
      } else {
        results.push({ bucket: 'pdfs', status: 'created' })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket setup complete',
      results,
      instructions: [
        '1. Go to your Supabase dashboard',
        '2. Click on "Storage" in the sidebar',
        '3. For each bucket (pdf-images, pdfs), set up policies:',
        '4. Go to the "Policies" tab',
        '5. Create the following policies:',
        '   - INSERT: Allow authenticated users',
        '   - SELECT: Allow public access',
        '   - UPDATE: Allow authenticated users',
        '   - DELETE: Allow authenticated users'
      ]
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to setup bucket'
    })
  }
}
