import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const pdfFile = formData.get('pdf') as File | null
    const presetId = formData.get('presetId') as string
    const content = formData.get('content') as string
    const userId = formData.get('userId') as string
    const pdfName = formData.get('pdfName') as string

    if (!pdfFile || !presetId || !content || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: pdf, presetId, content, userId' },
        { status: 400 }
      )
    }

    console.log('📥 Received PDF upload request:', {
      pdfSize: pdfFile.size,
      pdfName,
      presetId,
      userId,
      contentLength: content.length
    })

    // Verify preset exists
    const { data: preset, error: presetError } = await supabaseAdmin
      .from('presets')
      .select('id, name')
      .eq('id', presetId)
      .single()

    if (presetError || !preset) {
      console.error('Preset not found:', presetError)
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    // Convert File to buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = (pdfName || preset.name).replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${userId}/${sanitizedName}_${timestamp}.pdf`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('pdfs')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Failed to upload PDF to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage', details: uploadError.message },
        { status: 500 }
      )
    }

    console.log('✅ PDF uploaded to storage:', uploadData.path)

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('pdfs')
      .getPublicUrl(filename)

    // Save PDF document record
    const { data: pdfDoc, error: pdfError } = await supabaseAdmin
      .from('pdf_documents')
      .insert([{
        preset_id: presetId,
        content,
        user_id: userId,
        pdf_name: pdfName || `PDF Document ${timestamp}`,
        pdf_url: urlData.publicUrl,
        storage_path: filename
      }])
      .select()
      .single()

    if (pdfError) {
      console.error('Failed to save PDF document record:', pdfError)
      // Try to clean up the uploaded file
      await supabaseAdmin.storage.from('pdfs').remove([filename])
      
      return NextResponse.json(
        { 
          error: 'Failed to save PDF document record',
          details: pdfError.message 
        },
        { status: 500 }
      )
    }

    console.log('✅ PDF document record saved:', pdfDoc.id)

    return NextResponse.json({
      success: true,
      pdfId: pdfDoc.id,
      pdfUrl: urlData.publicUrl,
      message: 'PDF generated and saved successfully'
    })

  } catch (error) {
    console.error('PDF upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF upload' },
      { status: 500 }
    )
  }
}
