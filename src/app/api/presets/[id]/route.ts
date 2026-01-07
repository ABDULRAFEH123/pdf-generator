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

    return NextResponse.json({ data }, { status: 200 })
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
    const trimmedName = typeof name === 'string' ? name.trim() : undefined

    const { data: existingPreset, error: existingPresetError } = await supabaseAdmin
      .from('presets')
      .select('id, user_id, pdf_size_id')
      .eq('id', id)
      .single()

    if (existingPresetError || !existingPreset) {
      console.error('Error fetching preset for update:', existingPresetError)
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    if (trimmedName) {
      const { data: dup, error: dupErr } = await supabaseAdmin
        .from('presets')
        .select('id')
        .eq('user_id', existingPreset.user_id)
        .eq('pdf_size_id', existingPreset.pdf_size_id)
        .ilike('name', trimmedName)
        .neq('id', id)
        .maybeSingle()

      if (dupErr) {
        console.error('Preset duplicate check error:', dupErr)
        return NextResponse.json(
          { error: 'Failed to validate preset name' },
          { status: 500 }
        )
      }

      if (dup) {
        return NextResponse.json(
          { error: `A preset named "${trimmedName}" already exists for this size.` },
          { status: 409 }
        )
      }
    }

    const updates: Record<string, unknown> = {}
    if (trimmedName !== undefined) updates.name = trimmedName
    if (typeof header_image_url === 'string') updates.header_image_url = header_image_url
    if (typeof footer_image_url === 'string') updates.footer_image_url = footer_image_url

    const { data, error } = await supabaseAdmin
      .from('presets')
      .update(updates)
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