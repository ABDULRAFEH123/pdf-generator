import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test Supabase connection
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      return NextResponse.json({
        success: false,
        error: bucketError.message,
        buckets: null
      })
    }

    return NextResponse.json({
      success: true,
      buckets: buckets?.map(b => ({
        name: b.name,
        public: b.public,
        created_at: b.created_at
      }))
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Supabase'
    })
  }
}
