import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get all PDF documents for the user
    const { data: pdfDocs, error } = await supabaseAdmin
      .from('pdf_documents')
      .select(`
        id,
        content,
        created_at,
        pdf_name,
        presets (
          name,
          header_image_url,
          footer_image_url,
          header_height,
          footer_height,
          pdf_sizes (
            name,
            width,
            height
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PDF documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch PDF documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pdfs: pdfDocs || []
    })
  } catch (error) {
    console.error('Error in PDF user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
