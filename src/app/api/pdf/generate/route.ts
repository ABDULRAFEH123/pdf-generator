import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jsPDF from 'jspdf'

export async function POST(request: NextRequest) {
  try {
    const { presetId, content, userId } = await request.json()

    if (!presetId || !content || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get preset details
    const { data: preset, error: presetError } = await supabaseAdmin
      .from('presets')
      .select(`
        *,
        pdf_sizes (
          name,
          width,
          height
        )
      `)
      .eq('id', presetId)
      .single()

    if (presetError || !preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdf = new jsPDF({
      orientation: preset.pdf_sizes.width > preset.pdf_sizes.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [preset.pdf_sizes.width, preset.pdf_sizes.height]
    })

    const pageWidth = preset.pdf_sizes.width
    const pageHeight = preset.pdf_sizes.height
    const headerHeight = preset.header_height
    const footerHeight = preset.footer_height
    const contentHeight = pageHeight - headerHeight - footerHeight

    // Add header image
    if (preset.header_image_url) {
      try {
        const headerImg = await loadImage(preset.header_image_url)
        pdf.addImage(headerImg, 'JPEG', 0, 0, pageWidth, headerHeight)
      } catch (error) {
        console.error('Failed to load header image:', error)
      }
    }

    // Add footer image
    if (preset.footer_image_url) {
      try {
        const footerImg = await loadImage(preset.footer_image_url)
        pdf.addImage(footerImg, 'JPEG', 0, pageHeight - footerHeight, pageWidth, footerHeight)
      } catch (error) {
        console.error('Failed to load footer image:', error)
      }
    }

    // Add text content directly to PDF
    const textContent = parseSimpleText(content)
    const margin = 20
    const textWidth = pageWidth - (margin * 2)
    const textHeight = contentHeight - (margin * 2)
    
    // Set font and add text
    pdf.setFont('helvetica')
    pdf.setFontSize(12)
    
    // Split content into lines and add to PDF
    const lines = pdf.splitTextToSize(textContent, textWidth)
    let yPosition = headerHeight + margin
    
    for (const line of lines) {
      if (yPosition + 15 > pageHeight - footerHeight - margin) {
        // Add new page if content overflows
        pdf.addPage()
        yPosition = margin
      }
      pdf.text(line, margin, yPosition)
      yPosition += 15
    }

    // Save PDF to buffer
    const pdfBuffer = pdf.output('arraybuffer')

    // Save PDF document record
    const { data: pdfDoc, error: pdfError } = await supabaseAdmin
      .from('pdf_documents')
      .insert([{
        preset_id: presetId,
        content,
        user_id: userId
      }])
      .select()
      .single()

    if (pdfError) {
      console.error('Failed to save PDF document record:', pdfError)
    }

    // Return PDF as base64
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

// Parse simple text formatting
const parseSimpleText = (content: string): string => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
    .replace(/<u>(.*?)<\/u>/g, '$1') // Remove underline markers
    .replace(/• /g, '• ') // Keep bullet points
    .replace(/^\d+\. /gm, '') // Remove numbered list markers
}

// Load image for server-side use
const loadImage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:image/jpeg;base64,${base64}`
  } catch (error) {
    console.error('Error loading image:', error)
    throw error
  }
}
