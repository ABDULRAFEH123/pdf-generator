import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing storage access...')
    
    // Test 1: List buckets
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    console.log('Buckets:', buckets)
    console.log('Bucket error:', bucketError)
    
    if (bucketError) {
      return NextResponse.json({
        success: false,
        error: `Bucket error: ${bucketError.message}`,
        buckets: null
      })
    }
    
    // Test 2: List files in pdf-images bucket
    const { data: files, error: fileError } = await supabaseAdmin.storage
      .from('pdf-images')
      .list('images', { limit: 10 })
    
    console.log('Files:', files)
    console.log('File error:', fileError)
    
    return NextResponse.json({
      success: true,
      buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
      files: files || [],
      fileError: fileError?.message || null
    })
  } catch (error) {
    console.error('Storage test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}
