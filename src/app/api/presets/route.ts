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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch presets' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, pdf_size_id, header_image_url, footer_image_url, header_height, footer_height, user_id } = body

    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!trimmedName || !pdf_size_id || !header_image_url || !footer_image_url || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Prevent duplicate preset names within the same size for the same user
    const { data: existingPreset, error: existingPresetError } = await supabaseAdmin
      .from('presets')
      .select('id')
      .eq('user_id', user_id)
      .eq('pdf_size_id', pdf_size_id)
      .ilike('name', trimmedName)
      .maybeSingle()

    if (existingPresetError) {
      console.error('Preset duplicate check error:', existingPresetError)
      return NextResponse.json(
        { error: 'Failed to validate preset name' },
        { status: 500 }
      )
    }

    if (existingPreset) {
      return NextResponse.json(
        { error: `A preset named "${trimmedName}" already exists for this size.` },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('presets')
      .insert([{
        name: trimmedName,
        pdf_size_id,
        header_image_url,
        footer_image_url,
        header_height: header_height || 400,
        footer_height: footer_height || 400,
        user_id
      }])
      .select()
      .single()

    if (error) {
      console.error('Preset creation error:', error)
      return NextResponse.json(
        { error: `Failed to create preset: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
