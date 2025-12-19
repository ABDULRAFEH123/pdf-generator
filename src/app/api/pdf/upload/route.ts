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
    const pdfId = formData.get('pdfId') as string // For updating existing PDF

    // For new PDFs, require presetId and userId
    // For updates (pdfId provided), only require pdfId, content, pdfName
    const isUpdate = !!pdfId
    
    if (!pdfFile || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: pdf, content' },
        { status: 400 }
      )
    }
    
    if (!isUpdate && (!presetId || !userId)) {
      return NextResponse.json(
        { error: 'Missing required fields for new PDF: presetId, userId' },
        { status: 400 }
      )
    }

    console.log('📥 Received PDF upload request:', {
      pdfSize: pdfFile.size,
      pdfName,
      presetId,
      userId,
      pdfId,
      isUpdate,
      contentLength: content.length
    })

    // Convert File to buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    // Handle UPDATE of existing PDF
    if (isUpdate) {
      // Get existing PDF to find old storage path and user_id
      const { data: existingPdf, error: fetchError } = await supabaseAdmin
        .from('pdf_documents')
        .select('storage_path, user_id')
        .eq('id', pdfId)
        .single()

      if (fetchError || !existingPdf) {
        console.error('PDF not found for update:', fetchError)
        return NextResponse.json(
          { error: 'PDF not found' },
          { status: 404 }
        )
      }

      // Delete old file from storage if exists
      if (existingPdf.storage_path) {
        console.log('🗑️ Deleting old PDF from storage:', existingPdf.storage_path)
        await supabaseAdmin.storage.from('pdfs').remove([existingPdf.storage_path])
      }

      // Generate new filename
      const timestamp = Date.now()
      const sanitizedName = (pdfName || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const filename = `${existingPdf.user_id}/${sanitizedName}_${timestamp}.pdf`

      // Upload new PDF to storage
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

      console.log('✅ New PDF uploaded to storage:', uploadData.path)

      // Get public URL
      const { data: urlData } = supabaseAdmin
        .storage
        .from('pdfs')
        .getPublicUrl(filename)

      // Update PDF document record
      const { data: pdfDoc, error: pdfError } = await supabaseAdmin
        .from('pdf_documents')
        .update({
          content,
          pdf_name: pdfName,
          pdf_url: urlData.publicUrl,
          storage_path: filename,
          pdf_data: null // Clear any legacy base64 data
        })
        .eq('id', pdfId)
        .select()
        .single()

      if (pdfError) {
        console.error('Failed to update PDF document record:', pdfError)
        return NextResponse.json(
          { error: 'Failed to update PDF document record', details: pdfError.message },
          { status: 500 }
        )
      }

      console.log('✅ PDF document updated:', pdfDoc.id)

      return NextResponse.json({
        success: true,
        pdfId: pdfDoc.id,
        pdfUrl: urlData.publicUrl,
        message: 'PDF updated successfully'
      })
    }

    // Handle CREATE new PDF
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
