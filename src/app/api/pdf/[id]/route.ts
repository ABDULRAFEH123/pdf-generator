import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      )
    }

    const { content } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Update the PDF document content
    const { data, error } = await supabaseAdmin
      .from('pdf_documents')
      .update({ content })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating PDF:', error)
      return NextResponse.json(
        { error: 'Failed to update PDF' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error updating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to update PDF' },
      { status: 500 }
    )
  }
}

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