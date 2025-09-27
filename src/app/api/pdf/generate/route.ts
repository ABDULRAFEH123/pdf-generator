import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
    const { data: preset, error: presetError } = await supabase
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
      const headerImg = await loadImage(preset.header_image_url)
      pdf.addImage(headerImg, 'JPEG', 0, 0, pageWidth, headerHeight)
    }

    // Add footer image
    if (preset.footer_image_url) {
      const footerImg = await loadImage(preset.footer_image_url)
      pdf.addImage(footerImg, 'JPEG', 0, pageHeight - footerHeight, pageWidth, footerHeight)
    }

    // Create a temporary div for content rendering
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.width = `${pageWidth - 40}px`
    tempDiv.style.padding = '20px'
    tempDiv.style.fontFamily = 'Arial, sans-serif'
    tempDiv.style.fontSize = '12px'
    tempDiv.style.lineHeight = '1.4'
    tempDiv.style.color = '#000000'
    document.body.appendChild(tempDiv)

    // Convert content to canvas
    const canvas = await html2canvas(tempDiv, {
      width: pageWidth - 40,
      height: contentHeight,
      scale: 2,
      useCORS: true,
      allowTaint: true
    })

    // Remove temporary div
    document.body.removeChild(tempDiv)

    // Add content to PDF
    const contentImg = canvas.toDataURL('image/png')
    pdf.addImage(contentImg, 'PNG', 20, headerHeight, pageWidth - 40, contentHeight)

    // Save PDF to buffer
    const pdfBuffer = pdf.output('arraybuffer')

    // Save PDF document record
    const { data: pdfDoc, error: pdfError } = await supabase
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

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
