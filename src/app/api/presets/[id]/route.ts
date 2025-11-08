import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
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

    // Get the preset from database with pdf_sizes
    const { data, error } = await supabaseAdmin
      .from('presets')
      .select(`
        *,
        pdf_sizes (
          name,
          width,
          height
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching preset:', error)
      return NextResponse.json(
        { error: 'Failed to fetch preset' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error fetching preset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preset' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      )
    }

    const { name, header_image_url, footer_image_url } = body

    // Update the preset in database
    const { data, error } = await supabaseAdmin
      .from('presets')
      .update({
        name,
        header_image_url,
        footer_image_url,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating preset:', error)
      return NextResponse.json(
        { error: 'Failed to update preset' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error updating preset:', error)
    return NextResponse.json(
      { error: 'Failed to update preset' },
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