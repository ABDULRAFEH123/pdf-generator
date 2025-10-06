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
        { error: 'Preset ID is required' },
        { status: 400 }
      )
    }

    // Delete the preset from database
    const { error } = await supabaseAdmin
      .from('presets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting preset:', error)
      return NextResponse.json(
        { error: 'Failed to delete preset' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Preset deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting preset:', error)
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    )
  }
}