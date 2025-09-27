import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'header' or 'footer'
    const pdfWidth = parseInt(formData.get('pdfWidth') as string)

    if (!file || !type || !pdfWidth) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Validate dimensions
    const expectedHeight = type === 'header' ? 300 : 200
    const image = new Image()
    const imageUrl = URL.createObjectURL(file)
    
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => {
        resolve({ width: image.width, height: image.height })
        URL.revokeObjectURL(imageUrl)
      }
      image.onerror = reject
      image.src = imageUrl
    })

    if (dimensions.width !== pdfWidth || dimensions.height !== expectedHeight) {
      return NextResponse.json(
        { error: `${type} image must be exactly ${pdfWidth} × ${expectedHeight} pixels. Current: ${dimensions.width} × ${dimensions.height}` },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${type}_${Date.now()}.${fileExt}`
    const filePath = `images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('pdf-images')
      .upload(filePath, file)

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    const { data } = supabase.storage
      .from('pdf-images')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: data.publicUrl,
      dimensions: {
        width: dimensions.width,
        height: dimensions.height
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
