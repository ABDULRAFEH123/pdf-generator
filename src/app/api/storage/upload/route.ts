import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'header' or 'footer'
    const pdfWidth = parseInt(formData.get('pdfWidth') as string)

    console.log('Upload request received:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      type,
      pdfWidth
    })

    if (!file || !type || !pdfWidth) {
      console.error('Missing required fields:', { file: !!file, type, pdfWidth })
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

    // Validate dimensions using sharp
    const expectedHeight = type === 'header' ? 300 : 300
    
    try {
      const buffer = await file.arrayBuffer()
      const imageInfo = await sharp(buffer).metadata()
      
      if (imageInfo.width !== pdfWidth || imageInfo.height !== expectedHeight) {
        return NextResponse.json(
          { error: `${type} image must be exactly ${pdfWidth} × ${expectedHeight} pixels. Current: ${imageInfo.width} × ${imageInfo.height}` },
          { status: 400 }
        )
      }
    } catch (sharpError) {
      console.error('Sharp error:', sharpError)
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${type}_${Date.now()}.${fileExt}`
    const filePath = `images/${fileName}`

    console.log('Attempting to upload to:', filePath)

    // Check if bucket exists first
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    console.log('Available buckets:', buckets?.map(b => b.name))
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError)
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('pdf-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data } = supabaseAdmin.storage
      .from('pdf-images')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: data.publicUrl,
      dimensions: {
        width: pdfWidth,
        height: expectedHeight
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
