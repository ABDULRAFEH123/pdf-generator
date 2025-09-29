import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json({
        success: false,
        error: `Failed to list buckets: ${listError.message}`
      })
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'pdf-images')
    
    if (bucketExists) {
      return NextResponse.json({
        success: true,
        message: 'Bucket already exists',
        bucket: 'pdf-images'
      })
    }

    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket('pdf-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Failed to create bucket: ${error.message}`
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket created successfully! Now you need to set up storage policies in the Supabase dashboard.',
      bucket: 'pdf-images',
      instructions: [
        '1. Go to your Supabase dashboard',
        '2. Click on "Storage" in the sidebar',
        '3. Click on the "pdf-images" bucket',
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
