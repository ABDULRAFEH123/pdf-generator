import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      )
    }

    // Delete the PDF document from database
    const { error } = await supabaseAdmin
      .from('pdf_documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting PDF:', error)
      return NextResponse.json(
        { error: 'Failed to delete PDF' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'PDF deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting PDF:', error)
    return NextResponse.json(
      { error: 'Failed to delete PDF' },
      { status: 500 }
    )
  }
}