import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jsPDF from 'jspdf'
import '@/assets/font/impact-normal.js'
import '@/assets/font/RobotoSerif-Medium-normal.js'
import '@/assets/font/Verdana-normal.js'
import '@/assets/font/OpenSans-Regular-normal.js'
import '@/assets/font/Lato-Medium-normal.js'
import '@/assets/font/RobotoMono-Regular-normal.js'
import '@/assets/font/georgia-normal.js'
import '@/assets/font/Cambria-normal.js'
import '@/assets/font/Garamond Regular-normal.js'
import '@/assets/font/Arial Regular-normal.js'
import '@/assets/font/Calibri-normal.js'
import html2canvas from 'html2canvas'

export async function POST(request: NextRequest) {
  try {
    const { presetId, content, userId, pdfName } = await request.json()

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

    // Generate PDF - use A4 standard if dimensions match, otherwise custom
    let pdfConfig
    if (preset.pdf_sizes.width === 2480 && preset.pdf_sizes.height === 3508) {
      // A4 size - use standard measurements
      pdfConfig = {
        orientation: 'portrait' as const,
        unit: 'mm' as const,
        format: 'a4' as const
      }
    } else {
      // Custom size - convert pixels to mm for better rendering
      const mmWidth = (preset.pdf_sizes.width * 25.4) / 300  // Convert px to mm (300 DPI)
      const mmHeight = (preset.pdf_sizes.height * 25.4) / 300
      pdfConfig = {
        orientation: preset.pdf_sizes.width > preset.pdf_sizes.height ? 'landscape' as const : 'portrait' as const,
        unit: 'mm' as const,
        format: [mmWidth, mmHeight] as [number, number]
      }
    }
    
    const pdf = new jsPDF(pdfConfig)

    // Get page dimensions in mm
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Convert header/footer heights from pixels to mm
    const headerHeight = (preset.header_height * 25.4) / 300
    const footerHeight = (preset.footer_height * 25.4) / 300
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

    // Add formatted HTML content to PDF with detailed spacing debugging
    const margin = 10 // 10mm margin
    const textWidth = pageWidth - (margin * 2)
    const textHeight = contentHeight - (margin * 2)
    
  
    
    // Count different elements
    const pMatches = content.match(/<p[^>]*>/gi) || []
    const brMatches = content.match(/<br\s*\/?>/gi) || []
    const h1Matches = content.match(/<h1[^>]*>/gi) || []
    const h2Matches = content.match(/<h2[^>]*>/gi) || []
    const h3Matches = content.match(/<h3[^>]*>/gi) || []
    const ulMatches = content.match(/<ul[^>]*>/gi) || []
    const olMatches = content.match(/<ol[^>]*>/gi) || []
    const liMatches = content.match(/<li[^>]*>/gi) || []

    await addHTMLContentToPDF(pdf, content, {
      x: margin,
      y: headerHeight + margin,
      width: textWidth,
      maxHeight: textHeight,
      pageHeight,
      footerHeight,
      headerHeight,
      margin,
      pageWidth,
      headerImageUrl: preset.header_image_url,
      footerImageUrl: preset.footer_image_url
    })

    // Save PDF to buffer
    const pdfBuffer = pdf.output('arraybuffer')

    // Convert PDF to base64 for storage
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
    
    // Save PDF document record - use basic insert for now
    const filename = `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`
    
    // For now, just save the basic record without pdf_data and filename
    // TODO: Add pdf_data and filename columns to database schema
    const { data: pdfDoc, error: pdfError } = await supabaseAdmin
      .from('pdf_documents')
      .insert([{
        preset_id: presetId,
        content,
        user_id: userId,
        pdf_name: pdfName || `PDF Document ${Date.now()}`
      }])
      .select()
      .single()

    if (pdfError) {
      console.error('Failed to save PDF document record:', pdfError)
      console.error('Error details:', {
        message: pdfError.message,
        details: pdfError.details,
        hint: pdfError.hint,
        code: pdfError.code
      })
      return NextResponse.json(
        { 
          error: 'Failed to save PDF document',
          details: pdfError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pdfId: pdfDoc.id,
      message: 'PDF generated and saved successfully'
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

// Add HTML content to PDF with proper formatting
const addHTMLContentToPDF = async (
  pdf: jsPDF, 
  htmlContent: string, 
  options: {
    x: number
    y: number
    width: number
    maxHeight: number
    pageHeight: number
    footerHeight: number
    headerHeight: number
    margin: number
    pageWidth: number
    headerImageUrl?: string
    footerImageUrl?: string
  }
) => {
  const { x, y, width, maxHeight, pageHeight, footerHeight, headerHeight, margin, pageWidth, headerImageUrl, footerImageUrl } = options

  // Helper function to add header and footer to any page
  const addHeaderAndFooterToPage = async (pdf: jsPDF, pageNumber: number) => {
    // Add header image
    if (headerImageUrl) {
      try {
        const headerImg = await loadImage(headerImageUrl)
        pdf.addImage(headerImg, 'JPEG', 0, 0, pageWidth, headerHeight)
      } catch (error) {
        console.error(`Failed to load header image for page ${pageNumber}:`, error)
      }
    }

    // Add footer image
    if (footerImageUrl) {
      try {
        const footerImg = await loadImage(footerImageUrl)
        pdf.addImage(footerImg, 'JPEG', 0, pageHeight - footerHeight, pageWidth, footerHeight)
      } catch (error) {
        console.error(`Failed to load footer image for page ${pageNumber}:`, error)
      }
    }
  }

  // Parse HTML content and convert to formatted text
  const parsedContent = parseHTMLContent(htmlContent)
 
  let currentY = y
  let currentPage = 1
  let renderedElements = 0
  let lastElementType = ''
  
  for (const element of parsedContent) {
 
    // Minimal spacing between different content types
    if (lastElementType && lastElementType !== element.type && element.type !== 'spacing') {
      // Only add minimal spacing for major content type changes
      if (lastElementType === 'h1' || lastElementType === 'h2' || lastElementType === 'h3') {
        currentY += 2 // Minimal spacing after headings
      } else if (element.type === 'h1' || element.type === 'h2' || element.type === 'h3') {
        currentY += 1 // Minimal spacing before headings
      } else {
        console.log(`🟡 SPACING: No spacing added for ${lastElementType} -> ${element.type}`)
      }
      // Remove all other spacing - let the content flow naturally
    }
    
    // Skip spacing elements
    if (element.type === 'spacing') {
      console.log('Skipping spacing element')
      continue
    }
    
    // Check if we need a new page
    if (currentY + element.height > pageHeight - footerHeight - margin) {
      pdf.addPage()
      currentPage++
      await addHeaderAndFooterToPage(pdf, currentPage)
      currentY = headerHeight + margin
    }
    
    // Handle headings with proper font sizes and wrapping
    if (element.type === 'h1' || element.type === 'h2' || element.type === 'h3') {
      pdf.setFont('helvetica', 'bold')
      const fontSize = element.type === 'h1' ? 24 : element.type === 'h2' ? 20 : 16
      pdf.setFontSize(fontSize)
      
      // Wrap heading text if needed
      const wrappedLines = splitTextToLines(pdf, element.text, width)
      
      for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i]
        
        // Handle alignment for headings
        let textX = x
        if (element.align === 'center') {
          textX = x + (width - pdf.getTextWidth(line)) / 2
        } else if (element.align === 'right') {
          textX = x + width - pdf.getTextWidth(line)
        }
        
        pdf.text(line, textX, currentY)
        
        // Add line spacing except for last line
        if (i < wrappedLines.length - 1) {
          currentY += (fontSize * 0.0) // Reduced proportional line height
          
          // Check if we need a new page
          if (currentY + (fontSize * 0.0) > pageHeight - footerHeight - margin) {
            pdf.addPage()
            currentPage++
            await addHeaderAndFooterToPage(pdf, currentPage)
            currentY = headerHeight + margin
          }
        }
      }
      
      // No extra spacing after headings - spacing is handled by the main loop
      renderedElements++
      continue
    }
    
    // Handle list items
    if (element.type === 'list-item') {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(14)
      
      const wrappedLines = splitTextToLines(pdf, element.text, width)
      
      for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i]
        pdf.text(line, x, currentY)
        
        if (i < wrappedLines.length - 1) {
          currentY += 0 // 0mm line height (tighter spacing)
          
          if (currentY + 6 > pageHeight - footerHeight - margin) {
            pdf.addPage()
            currentPage++
            await addHeaderAndFooterToPage(pdf, currentPage)
            currentY = headerHeight + margin
          }
        }
      }
      
      // No extra spacing after list items - spacing is handled by the main loop
      renderedElements++
      continue
    }
    
    // Handle regular text with proper wrapping
    if (element.text) {
      
      // Use formatted parts if available, otherwise use simple text
      if (element.formattedParts && element.formattedParts.length > 0) {
        
        // Handle formatted text with wrapping and get the new Y position
        const result = await addFormattedTextWithWrapping(
          pdf, 
          element.formattedParts, 
          x, 
          currentY, 
          width, 
          element.align,
          {
            pageHeight,
            footerHeight,
            headerHeight,
            margin,
            pageWidth,
            headerImageUrl,
            footerImageUrl,
            addHeaderAndFooter: addHeaderAndFooterToPage,
            currentPage
          }
        )
        currentY = result.y
        currentPage = result.page
      } else {
        
        // Fallback for simple text with wrapping
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(14)
        
        const wrappedLines = splitTextToLines(pdf, element.text, width)
        
        for (let i = 0; i < wrappedLines.length; i++) {
          const line = wrappedLines[i]
          
          // Handle alignment
          let textX = x
          if (element.align === 'center') {
            textX = x + (width - pdf.getTextWidth(line)) / 2
          } else if (element.align === 'right') {
            textX = x + width - pdf.getTextWidth(line)
          }
          
          pdf.text(line, textX, currentY)
          
          // Add line spacing except for last line
          if (i < wrappedLines.length - 1) {
            currentY += 0 // 0mm line height (tighter spacing)
            
            // Check if we need a new page
            if (currentY + 6 > pageHeight - footerHeight - margin) {
              pdf.addPage()
              currentPage++
              await addHeaderAndFooterToPage(pdf, currentPage)
              currentY = headerHeight + margin
            }
          }
        }
      }
    }
    
    // No automatic spacing - let content flow naturally like in the preview
    
    // Update last element type for spacing logic
    lastElementType = element.type
    renderedElements++
  }
  }

// Helper function to split text into lines that fit within the given width
const splitTextToLines = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  // Helper to break a long word into chunks that fit maxWidth
  const breakLongWord = (word: string): string[] => {
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const char of word) {
      const testChunk = currentChunk + char
      if (pdf.getTextWidth(testChunk) <= maxWidth) {
        currentChunk = testChunk
      } else {
        if (currentChunk) {
          chunks.push(currentChunk)
        }
        currentChunk = char
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }

  for (const word of words) {
    // First check if the word itself is too long
    if (pdf.getTextWidth(word) > maxWidth) {
      // Push current line if exists
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ''
      }
      // Break the long word into chunks
      const chunks = breakLongWord(word)
      for (let i = 0; i < chunks.length - 1; i++) {
        lines.push(chunks[i])
      }
      // Last chunk becomes current line (may be combined with next word)
      currentLine = chunks[chunks.length - 1] || ''
    } else {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = pdf.getTextWidth(testLine)

      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          lines.push(word)
        }
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

// Helper function to calculate how many lines text will take
const calculateLinesUsed = (pdf: jsPDF, text: string, maxWidth: number, fontSize: number): number => {
  pdf.setFontSize(fontSize)
  const lines = splitTextToLines(pdf, text, maxWidth)
  return lines.length
}

// Helper function to add formatted text with proper wrapping
const addFormattedTextWithWrapping = async (
  pdf: jsPDF, 
  formattedParts: Array<{ text: string; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }>, 
  x: number, 
  startY: number, 
  maxWidth: number, 
  align?: string,
  pageOptions?: {
    pageHeight: number
    footerHeight: number
    headerHeight: number
    margin: number
    pageWidth: number
    headerImageUrl?: string
    footerImageUrl?: string
    addHeaderAndFooter: (pdf: jsPDF, pageNumber: number) => Promise<void>
    currentPage: number
  }
): Promise<{ y: number; page: number }> => {
  let currentY = startY
  let currentPageNum = pageOptions?.currentPage || 1
  let currentX = x
  let currentLine = ''
  let currentLineWidth = 0
  let currentLineMaxFontSize = 14 // Track the largest font size on current line
  const parts: Array<{ text: string; x: number; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }> = []
  
  // Helper to safely set font
  const safeSetFont = (fontFamily: string, fontStyle: string) => {
    try {
      const isCustomFont = !['helvetica', 'times', 'courier'].includes(fontFamily.toLowerCase())
      const actualStyle = isCustomFont ? 'normal' : fontStyle
      pdf.setFont(fontFamily, actualStyle)
      return true
    } catch (e) {
      pdf.setFont('helvetica', fontStyle)
      return false
    }
  }
  
  // Helper to calculate line height based on font size (points to mm conversion)
  // Font size in points, line height ~1.2x the font size in mm
  const calculateLineHeight = (fontSize: number): number => {
    // 1 point = 0.3528 mm, typical line height is 1.2-1.4x font size
    // Use a minimum line height of 5mm for small fonts to prevent cramped text
    const calculatedHeight = fontSize * 0.3528 * 1.2
    const minLineHeight = 5 // minimum 5mm line height
    return Math.max(calculatedHeight, minLineHeight)
  }

  // Helper to break a long word into chunks that fit maxWidth
  const breakLongWord = (word: string, maxW: number): string[] => {
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const char of word) {
      const testChunk = currentChunk + char
      if (pdf.getTextWidth(testChunk) <= maxW) {
        currentChunk = testChunk
      } else {
        if (currentChunk) {
          chunks.push(currentChunk)
        }
        currentChunk = char
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks.length > 0 ? chunks : [word]
  }

  // Helper to check and handle page breaks
  const checkPageBreak = async (lineHeight: number): Promise<void> => {
    if (pageOptions && currentY + lineHeight > pageOptions.pageHeight - pageOptions.footerHeight - pageOptions.margin) {
      pdf.addPage()
      currentPageNum++
      await pageOptions.addHeaderAndFooter(pdf, currentPageNum)
      currentY = pageOptions.headerHeight + pageOptions.margin
    }
  }

  // Build the full text with formatting info
  for (const part of formattedParts) {
    const words = part.text.split(' ')
    const fontFamily = part.fontFamily || 'helvetica'
    const fontSize = part.fontSize || 14
    
    for (let i = 0; i < words.length; i++) {
      let word = words[i]
      const spaceNeeded = i === 0 && currentLine === '' ? '' : ' '
      
      // Set font to measure correctly
      let fontStyle = 'normal'
      if (part.isBold && part.isItalic) {
        fontStyle = 'bolditalic'
      } else if (part.isBold) {
        fontStyle = 'bold'
      } else if (part.isItalic) {
        fontStyle = 'italic'
      }
      
      safeSetFont(fontFamily, fontStyle)
      pdf.setFontSize(fontSize)
      
      // Check if the word itself is too long and needs to be broken
      const wordWidth = pdf.getTextWidth(word)
      if (wordWidth > maxWidth) {
        // First, render current line if exists
        if (currentLine) {
          await renderLine(pdf, parts, x, currentY, maxWidth, align)
          const lineHeight = calculateLineHeight(currentLineMaxFontSize)
          console.log(`📏 Line height for font size ${currentLineMaxFontSize}pt: ${lineHeight.toFixed(2)}mm`)
          parts.length = 0
          currentY += lineHeight
          // Check for page break
          await checkPageBreak(lineHeight)
          currentLineMaxFontSize = fontSize
          currentLine = ''
          currentLineWidth = 0
        }
        
        // Break the long word into chunks
        const chunks = breakLongWord(word, maxWidth)
        for (let j = 0; j < chunks.length; j++) {
          const chunk = chunks[j]
          if (j < chunks.length - 1) {
            // Render each chunk except the last one
            parts.push({
              text: chunk,
              x: currentX,
              isBold: part.isBold,
              isItalic: part.isItalic,
              fontSize: fontSize,
              fontFamily: fontFamily
            })
            await renderLine(pdf, parts, x, currentY, maxWidth, align)
            const lineHeight = calculateLineHeight(fontSize)
            console.log(`📏 Line height for font size ${fontSize}pt: ${lineHeight.toFixed(2)}mm`)
            parts.length = 0
            currentY += lineHeight
            // Check for page break after each chunk
            await checkPageBreak(lineHeight)
          } else {
            // Last chunk becomes current line
            currentLine = chunk
            currentLineWidth = pdf.getTextWidth(chunk)
            currentLineMaxFontSize = fontSize
          }
        }
        continue
      }
      
      const testText = spaceNeeded + word
      const testWidth = pdf.getTextWidth(testText)
      
      if (currentLineWidth + testWidth <= maxWidth) {
        // Word fits on current line
        currentLine += testText
        currentLineWidth += testWidth
        // Track the largest font size on this line
        if (fontSize > currentLineMaxFontSize) {
          currentLineMaxFontSize = fontSize
        }
      } else {
        // Word doesn't fit, start new line
        if (currentLine) {
          // Render current line
          await renderLine(pdf, parts, x, currentY, maxWidth, align)
          // Calculate line height based on the largest font size on this line
          const lineHeight = calculateLineHeight(currentLineMaxFontSize)
          console.log(`📏 Line height for font size ${currentLineMaxFontSize}pt: ${lineHeight.toFixed(2)}mm`)
          parts.length = 0
          currentY += lineHeight
          // Check for page break
          await checkPageBreak(lineHeight)
          currentLineMaxFontSize = fontSize // Reset to current font size for new line
        }
        
        currentLine = word
        currentLineWidth = pdf.getTextWidth(word)
      }
      
      // Add this word to parts for rendering - INCLUDING fontFamily and fontSize
      if (testText.trim()) {
        parts.push({
          text: testText.trim(),
          x: currentX,
          isBold: part.isBold,
          isItalic: part.isItalic,
          fontSize: fontSize,
          fontFamily: fontFamily
        })
      }
    }
  }

  // Render remaining line
  if (currentLine && parts.length > 0) {
    console.log(`🟢 FINAL LINE: Rendering final line "${currentLine}" at Y: ${currentY}`)
    await renderLine(pdf, parts, x, currentY, maxWidth, align)
    // Add final line height for accurate return value
    const finalLineHeight = calculateLineHeight(currentLineMaxFontSize)
    currentY += finalLineHeight
  }

  console.log(`🟢 FORMATTED TEXT COMPLETE: Final Y position: ${currentY}`)
  return { y: currentY, page: currentPageNum }
}

// Helper function to render a line with mixed formatting
const renderLine = async (
  pdf: jsPDF,
  parts: Array<{ text: string; x: number; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }>,
  x: number,
  y: number,
  maxWidth: number,
  align?: string
) => {
  if (parts.length === 0) return

  // Helper to safely set font with fallback
  const safeSetFont = (fontFamily: string, fontStyle: string) => {
    try {
      // Custom fonts typically only support 'normal' style
      const isCustomFont = !['helvetica', 'times', 'courier'].includes(fontFamily.toLowerCase())
      const actualStyle = isCustomFont ? 'normal' : fontStyle
      pdf.setFont(fontFamily, actualStyle)
      return fontFamily
    } catch (e) {
      console.warn(`Font ${fontFamily} not available, falling back to helvetica`)
      pdf.setFont('helvetica', fontStyle)
      return 'helvetica'
    }
  }

  // Calculate total line width for alignment
  let totalWidth = 0
  for (const part of parts) {
    let fontStyle = 'normal'
    if (part.isBold && part.isItalic) {
      fontStyle = 'bolditalic'
    } else if (part.isBold) {
      fontStyle = 'bold'
    } else if (part.isItalic) {
      fontStyle = 'italic'
    }
    const fontFamily = part.fontFamily || 'helvetica'
    const fontSize = part.fontSize || 14
    safeSetFont(fontFamily, fontStyle)
    pdf.setFontSize(fontSize)
    try {
      totalWidth += pdf.getTextWidth(part.text + ' ')
    } catch (e) {
      pdf.setFont('helvetica', fontStyle)
      totalWidth += pdf.getTextWidth(part.text + ' ')
    }
  }

  // Calculate starting X position based on alignment
  let startX = x
  if (align === 'center') {
    startX = x + (maxWidth - totalWidth) / 2
  } else if (align === 'right') {
    startX = x + maxWidth - totalWidth
  }

  // Render each part
  let currentX = startX
  for (const part of parts) {
    let fontStyle = 'normal'
    if (part.isBold && part.isItalic) {
      fontStyle = 'bolditalic'
    } else if (part.isBold) {
      fontStyle = 'bold'
    } else if (part.isItalic) {
      fontStyle = 'italic'
    }
    
    const fontFamily = part.fontFamily || 'helvetica'
    const fontSize = part.fontSize || 14
    
    // Use safe font setting
    const actualFont = safeSetFont(fontFamily, fontStyle)
    pdf.setFontSize(fontSize)
    pdf.text(part.text, currentX, y)
    
    let textWidth
    try {
      textWidth = pdf.getTextWidth(part.text + ' ')
    } catch (e) {
      console.warn(`Error getting text width, using helvetica:`, e)
      pdf.setFont('helvetica', fontStyle)
      textWidth = pdf.getTextWidth(part.text + ' ')
    }
    currentX += textWidth
  }
  
  // Return the current Y position (no need to calculate lines here)
  return y
}

// Helper function to decode HTML entities
const decodeHTMLEntities = (text: string): string => {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
    '&sect;': '§',
    '&para;': '¶',
    '&dagger;': '†',
    '&Dagger;': '‡',
    '&bull;': '•',
    '&hellip;': '…',
    '&prime;': '′',
    '&Prime;': '″',
    '&lsaquo;': '‹',
    '&rsaquo;': '›',
    '&laquo;': '«',
    '&raquo;': '»',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&sbquo;': '\u201A',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&bdquo;': '\u201E'
  }
  
  let decoded = text
  
  // Replace named entities
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }
  
  // Replace numeric entities (e.g., &#8217; or &#x2019;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10))
  })
  
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
  
  return decoded
}

// Parse HTML content into structured elements
const parseHTMLContent = (htmlContent: string) => {
  
  const elements: Array<{
    type: string
    text: string
    height: number
    align?: string
    formattedParts?: Array<{ text: string; isBold: boolean; isItalic: boolean }>
  }> = []
  
  // Sequential parsing to preserve order
  const htmlRegex = /<(h1|h2|h3|p|ol|ul)[^>]*>([\s\S]*?)<\/\1>/gi
  let match
  let lastIndex = 0
  
  while ((match = htmlRegex.exec(htmlContent)) !== null) {
    const [fullMatch, tagName, content] = match
    const cleanContent = decodeHTMLEntities(content.replace(/<[^>]*>/g, '').trim())
    
    if (cleanContent) {
      if (tagName === 'h1') {
        elements.push({
          type: 'h1',
          text: cleanContent,
          height: 20
        })
      } else if (tagName === 'h2') {
        elements.push({
          type: 'h2',
          text: cleanContent,
          height: 18
        })
      } else if (tagName === 'h3') {
        elements.push({
          type: 'h3',
          text: cleanContent,
          height: 16
        })
      } else if (tagName === 'p') {
        const processedContent = processFormattedContent(content)
        const fullText = processedContent.map(c => c.text).join('').trim()
        if (fullText.length > 0) {
          elements.push({
            type: 'normal',
            text: fullText,
            height: 15,
            formattedParts: processedContent
          })
        }
      } else if (tagName === 'ol') {
        // Handle ordered lists
        const listItems = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
        listItems.forEach((item, index) => {
          const itemContent = decodeHTMLEntities(item.replace(/<li[^>]*>|<\/li>/gi, '').replace(/<[^>]*>/g, '').trim())
          if (itemContent) {
            elements.push({
              type: 'list-item',
              text: `${index + 1}. ${itemContent}`,
              height: 15
            })
          }
        })
      } else if (tagName === 'ul') {
        // Handle unordered lists
        const listItems = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
        listItems.forEach((item) => {
          const itemContent = decodeHTMLEntities(item.replace(/<li[^>]*>|<\/li>/gi, '').replace(/<[^>]*>/g, '').trim())
          if (itemContent) {
            elements.push({
              type: 'list-item',
              text: `• ${itemContent}`,
              height: 15
            })
          }
        })
      }
      
      // Only add spacing between different content types, not after every element
      // We'll handle spacing in the rendering logic instead
    }
  }
  
  elements.forEach((el, i) => {
  
    if (el.formattedParts) {
      console.log(`  Formatted parts count: ${el.formattedParts.length}`)
      el.formattedParts.forEach((part, j) => {
        console.log(`    Part ${j}: "${part.text}" (bold: ${part.isBold}, italic: ${part.isItalic})`)
      })
    }
  })
  
  return elements
}

// Helper function to extract font size from HTML
const extractFontSize = (html: string): number | undefined => {
  // Check for size class (e.g., ql-size-14px, ql-size-large, ql-size-small)
  const sizeClassMatch = html.match(/class="[^"]*ql-size-(\d+px|\w+)[^"]*"/i)
  if (sizeClassMatch) {
    const sizeValue = sizeClassMatch[1]
    console.log('📏 [Generate] extractFontSize - Found size class:', sizeValue)
    // Check if it's a pixel value (e.g., "14px")
    if (sizeValue.endsWith('px')) {
      return parseInt(sizeValue.replace('px', ''), 10)
    }
    // Otherwise it's a named size
    const sizeMap: Record<string, number> = {
      'small': 10,
      'large': 18,
      'huge': 24
    }
    return sizeMap[sizeValue]
  }
  
  // Check for inline style font-size
  const styleFontSize = html.match(/style="[^"]*font-size:\s*(\d+)px[^"]*"/i)
  if (styleFontSize) {
    console.log('📏 [Generate] extractFontSize - Found inline style font-size:', styleFontSize[1])
    return parseInt(styleFontSize[1], 10)
  }
  
  console.log('📏 [Generate] extractFontSize - No font size found in:', html.substring(0, 100))
  return undefined
}

// Helper function to extract font family from HTML
const extractFontFamily = (html: string): string | undefined => {
  // Check for font class (e.g., ql-font-impact)
  const classMatch = html.match(/class="([^"]*)"/i)
  if (classMatch) {
    const classes = classMatch[1].split(' ')
    const fontClass = classes.find(c => c.startsWith('ql-font-'))
    if (fontClass) {
      const fontName = fontClass.replace('ql-font-', '')
      // Map font class names to actual font families (jsPDF built-in + custom TTF fonts)
      // Font names must match exactly what's registered in the font .js files
      const fontMap: Record<string, string> = {
        'sans-serif': 'helvetica',
        'times-new-roman': 'times',
        'courier-new': 'courier',
        'impact': 'impact',
        'robotoserif': 'RobotoSerif-Medium',
        'verdana': 'Verdana',
        'opensans': 'OpenSans-Regular',
        'lato': 'Lato-Medium',
        'robotomono': 'RobotoMono-Regular',
        'georgia': 'georgia',
        'cambria': 'Cambria',
        'garamond': 'Garamond Regular',
        'arial': 'Arial Regular',
        'calibri': 'Calibri'
      }
      const mappedFont = fontMap[fontName] || 'helvetica'
      return mappedFont
    }
  }
  return undefined
}

// Helper function to process formatted content while preserving order
const processFormattedContent = (content: string) => {
  const parts: Array<{ text: string; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }> = []
  
  console.log('📝 [Generate] processFormattedContent input:', content.substring(0, 200))
  
  // Remove underline tags but keep the content
  content = content.replace(/<\/?u[^>]*>/gi, '')
  
  // Parse HTML in order to preserve text sequence - NOW INCLUDING SPAN TAGS
  const regex = /(<span[^>]*>.*?<\/span>|<strong[^>]*><em[^>]*>.*?<\/em><\/strong>|<em[^>]*><strong[^>]*>.*?<\/strong><\/em>|<strong[^>]*>.*?<\/strong>|<b[^>]*>.*?<\/b>|<em[^>]*>.*?<\/em>|<i[^>]*>.*?<\/i>|[^<]+)/gi
  
  let match
  while ((match = regex.exec(content)) !== null) {
    const segment = match[0]
    
    // Extract font properties from the segment
    const fontSize = extractFontSize(segment)
    const fontFamily = extractFontFamily(segment)
    
    console.log('📝 [Generate] Segment:', segment.substring(0, 100), '| fontSize:', fontSize, '| fontFamily:', fontFamily)
    
    // Check what type of formatting this segment has
    if (segment.match(/<span[^>]*>/i)) {
      // Span tag (may contain font styles)
      const text = decodeHTMLEntities(segment.replace(/<[^>]*>/g, ''))
      if (text) {
        // Check if the span contains bold/italic tags inside
        const isBold = segment.includes('<strong>') || segment.includes('<b>')
        const isItalic = segment.includes('<em>') || segment.includes('<i>')
        console.log('📝 [Generate] Adding span part:', { text: text.substring(0, 30), isBold, isItalic, fontSize, fontFamily })
        parts.push({ text, isBold, isItalic, fontSize, fontFamily })
      }
    } else if (segment.match(/<strong[^>]*><em[^>]*>|<em[^>]*><strong[^>]*>/i)) {
      // Bold + Italic
      const text = decodeHTMLEntities(segment.replace(/<[^>]*>/g, ''))
      if (text) {
        parts.push({ text, isBold: true, isItalic: true, fontSize, fontFamily })
      }
    } else if (segment.match(/<strong[^>]*>|<b[^>]*>/i)) {
      // Bold only
      const text = decodeHTMLEntities(segment.replace(/<[^>]*>/g, ''))
      if (text) {
        parts.push({ text, isBold: true, isItalic: false, fontSize, fontFamily })
      }
    } else if (segment.match(/<em[^>]*>|<i[^>]*>/i)) {
      // Italic only
      const text = decodeHTMLEntities(segment.replace(/<[^>]*>/g, ''))
      if (text) {
        parts.push({ text, isBold: false, isItalic: true, fontSize, fontFamily })
      }
    } else if (!segment.match(/<[^>]*>/)) {
      // Plain text (no tags)
      if (segment) {
        parts.push({ text: decodeHTMLEntities(segment), isBold: false, isItalic: false, fontSize, fontFamily })
      }
    }
  }
  
  return parts
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
