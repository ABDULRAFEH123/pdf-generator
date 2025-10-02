import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      )
    }

    // Get PDF document from database
    const { data: pdfDoc, error } = await supabaseAdmin
      .from('pdf_documents')
      .select(`
        *,
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
      .eq('id', id)
      .single()

    if (error || !pdfDoc) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      pdf: pdfDoc
    })
  } catch (error) {
    console.error('Error fetching PDF:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PDF' },
      { status: 500 }
    )
  }
}
