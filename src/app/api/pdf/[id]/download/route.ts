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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      )
    }

    // Get PDF document from database
    const { data: pdfDoc, error } = await supabaseAdmin
      .from('pdf_documents')
      .select(`
        *,
        presets (
          name,
          header_image_url,
          footer_image_url,
          header_height,
          footer_height,
          pdf_sizes (
            name,
            width,
            height
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !pdfDoc) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      )
    }

    // If PDF data is stored, use it directly
    if (pdfDoc.pdf_data) {
      const pdfBuffer = Buffer.from(pdfDoc.pdf_data, 'base64')
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${pdfDoc.filename || 'document.pdf'}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    }

    // Otherwise, generate PDF on-demand
    const preset = pdfDoc.presets
    // Count different elements
    const pMatches = pdfDoc.content.match(/<p[^>]*>/gi) || []
    const brMatches = pdfDoc.content.match(/<br\s*\/?>/gi) || []
    const h1Matches = pdfDoc.content.match(/<h1[^>]*>/gi) || []
    const h2Matches = pdfDoc.content.match(/<h2[^>]*>/gi) || []
    const h3Matches = pdfDoc.content.match(/<h3[^>]*>/gi) || []
    const ulMatches = pdfDoc.content.match(/<ul[^>]*>/gi) || []
    const olMatches = pdfDoc.content.match(/<ol[^>]*>/gi) || []
    const liMatches = pdfDoc.content.match(/<li[^>]*>/gi) || []
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

    // Add content with proper margins in mm and detailed debugging
    const margin = 10 // 10mm margin
    const textWidth = pageWidth - (margin * 2)
    const textHeight = pageHeight - headerHeight - footerHeight - (margin * 2)
    
    
    await addHTMLContentToPDF(pdf, pdfDoc.content, {
      x: margin,
      y: headerHeight + margin,
      width: textWidth,
      maxHeight: textHeight,
      pageHeight,
      footerHeight,
      margin,
      headerImageUrl: preset.header_image_url,
      footerImageUrl: preset.footer_image_url,
      headerHeight,
      pageWidth
    })

    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer')
    
    // Use pdf_name if available, otherwise fall back to preset name
    const baseName = pdfDoc.pdf_name || preset.name
    const filename = `${baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Error downloading PDF:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Failed to download PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions (updated with detailed logging and proper spacing)
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
    margin: number
    headerImageUrl?: string
    footerImageUrl?: string
    headerHeight: number
    pageWidth: number
  }
) => {
  const { x, y, width, maxHeight, pageHeight, footerHeight, margin, headerImageUrl, footerImageUrl, headerHeight, pageWidth } = options
  const lineHeight = 6 // Standard line height (matches browser default)
  const brSpacing = 4 // Space added by a <br> tag
  


  // Helper function to add header and footer to any page
  const addHeaderAndFooterToPage = async (pdf: jsPDF, pageNumber: number) => {

    
    // Add header image
    if (headerImageUrl) {
      try {
        const headerImg = await loadImage(headerImageUrl)
        pdf.addImage(headerImg, 'JPEG', 0, 0, pageWidth, headerHeight)
 
      } catch (error) {
        console.error(`❌ Failed to load header image for page ${pageNumber}:`, error)
      }
    }

    // Add footer image
    if (footerImageUrl) {
      try {
        const footerImg = await loadImage(footerImageUrl)
        pdf.addImage(footerImg, 'JPEG', 0, pageHeight - footerHeight, pageWidth, footerHeight)
 
      } catch (error) {
        console.error(`❌ Failed to load footer image for page ${pageNumber}:`, error)
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
    
    // Handle spacing elements (br tags)
    if (element.type === 'spacing') {
      currentY += brSpacing
      continue
    }
    
    // Check if we need a new page
    if (currentY + element.height > pageHeight - footerHeight - margin) {
      pdf.addPage()
      currentPage++
      
      // Add header and footer to the new page
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
          currentY += (fontSize * 0.3) // Proportional line height for headings
          
          // Check if we need a new page
          if (currentY + (fontSize * 0.3) > pageHeight - footerHeight - margin) {
            pdf.addPage()
            currentPage++
            await addHeaderAndFooterToPage(pdf, currentPage)
            currentY = headerHeight + margin
          }
        }
      }
      
      // Add proper spacing after headings to prevent overlapping
      currentY += (fontSize * 0.5) // Add 50% of font size as spacing
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
          currentY += lineHeight // Add line height after each line
          
          if (currentY + lineHeight > pageHeight - footerHeight - margin) {
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
        
        // Add indentation for list items
        const renderX = element.isListItem ? x + 5 : x // 5mm indent for list items
        const renderWidth = element.isListItem ? width - 5 : width
        
        // Handle formatted text with wrapping and get the new Y position
        const result = await addFormattedTextWithWrapping(
          pdf, 
          element.formattedParts, 
          renderX, 
          currentY, 
          renderWidth, 
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
        
        // Add indentation for list items
        const renderX = element.isListItem ? x + 5 : x // 5mm indent for list items
        const renderWidth = element.isListItem ? width - 5 : width
        
        // Fallback for simple text with wrapping
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(14)
        
        const wrappedLines = splitTextToLines(pdf, element.text, renderWidth)
        
        for (let i = 0; i < wrappedLines.length; i++) {
          const line = wrappedLines[i]
          
          // Handle alignment
          let textX = renderX
          if (element.align === 'center') {
            textX = renderX + (renderWidth - pdf.getTextWidth(line)) / 2
          } else if (element.align === 'right') {
            textX = renderX + renderWidth - pdf.getTextWidth(line)
          }
          
          pdf.text(line, textX, currentY)
          
          // Add line spacing except for last line
          if (i < wrappedLines.length - 1) {
            currentY += lineHeight // Add line height after each line
            
            // Check if we need a new page
            if (currentY + lineHeight > pageHeight - footerHeight - margin) {
              pdf.addPage()
              currentPage++
              await addHeaderAndFooterToPage(pdf, currentPage)
              currentY = headerHeight + margin
            }
          }
        }
      }
    }
    
    // Add line height after each text element so they don't overlap
    if (element.type === 'normal') {
      currentY += lineHeight
    }
    
    // Update last element type for spacing logic
    lastElementType = element.type
    renderedElements++
  }
  
}

// Helper function to parse formatted text
const parseFormattedText = (text: string, originalHtml: string) => {
  const parts: Array<{ text: string; isBold: boolean; isItalic: boolean }> = []
  
  // Find the original HTML for this text to preserve formatting
  const textMatch = originalHtml.match(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  if (textMatch) {
    // Extract the HTML context around this text
    const startIndex = originalHtml.indexOf(textMatch[0])
    const contextStart = Math.max(0, startIndex - 200)
    const contextEnd = Math.min(originalHtml.length, startIndex + textMatch[0].length + 200)
    const context = originalHtml.substring(contextStart, contextEnd)
    
    // Process the context to extract formatting
    return processFormattedContent(context)
  }
  
  // Fallback: return as normal text
  return [{ text, isBold: false, isItalic: false }]
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
  // Log formatted parts for debugging if needed
  // formattedParts.forEach((part, i) => {
  //   console.log(`  Part ${i}: "${part.text}" (bold: ${part.isBold}, italic: ${part.isItalic}, fontSize: ${(part as any).fontSize || 'default'}, fontFamily: ${(part as any).fontFamily || 'default'})`)
  // })
  
  let currentY = startY
  let currentPageNum = pageOptions?.currentPage || 1
  let currentX = x
  let currentLine = ''
  let currentLineWidth = 0
  let currentLineMaxFontSize = 14 // Track the largest font size on current line
  const parts: Array<{ text: string; x: number; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }> = []
  
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
      
      // Try to set the font, fallback to helvetica if it fails
      try {
        pdf.setFont(fontFamily, fontStyle)
      } catch (e) {
        console.warn(`Font ${fontFamily} failed to load, falling back to helvetica:`, e)
        pdf.setFont('helvetica', fontStyle)
      }
      pdf.setFontSize(fontSize)
      
      // Check if the word itself is too long and needs to be broken
      let wordWidth
      try {
        wordWidth = pdf.getTextWidth(word)
      } catch (e) {
        pdf.setFont('helvetica', fontStyle)
        wordWidth = pdf.getTextWidth(word)
      }
      
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
      let testWidth
      try {
        testWidth = pdf.getTextWidth(testText)
      } catch (e) {
        console.warn(`Error getting text width for font ${fontFamily}, using helvetica:`, e)
        pdf.setFont('helvetica', fontStyle)
        testWidth = pdf.getTextWidth(testText)
      }
      
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
      
      // Add this word to parts for rendering
      if (testText.trim()) {
        parts.push({
          text: testText.trim(),
          x: currentX,
          isBold: part.isBold,
          isItalic: part.isItalic,
          fontSize: part.fontSize,
          fontFamily: part.fontFamily
        })
      }
    }
  }

  // Render remaining line
  if (currentLine && parts.length > 0) {
    await renderLine(pdf, parts, x, currentY, maxWidth, align)
    // Add final line height for accurate return value
    const finalLineHeight = calculateLineHeight(currentLineMaxFontSize)
    currentY += finalLineHeight
  }

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
    safeSetFont(fontFamily, fontStyle)
    pdf.setFontSize(fontSize)
    pdf.text(part.text, currentX, y)
    
    let textWidth
    try {
      textWidth = pdf.getTextWidth(part.text + ' ')
    } catch (e) {
      console.warn(`Error getting text width in renderLine, using helvetica:`, e)
      pdf.setFont('helvetica', fontStyle)
      textWidth = pdf.getTextWidth(part.text + ' ')
    }
    currentX += textWidth
  }
}

const parseHTMLContent = (htmlContent: string) => {
  const elements: Array<{
    type: string
    text: string
    height: number
    align?: string
    fontSize?: number
    fontFamily?: string
    formattedParts?: Array<{ text: string; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }>
    isListItem?: boolean
  }> = []
  
  // Parse HTML in order by splitting on tags and processing sequentially
  const regex = /(<h1[^>]*>.*?<\/h1>|<h2[^>]*>.*?<\/h2>|<h3[^>]*>.*?<\/h3>|<p[^>]*>.*?<\/p>|<ol[^>]*>.*?<\/ol>|<ul[^>]*>.*?<\/ul>|<br\s*\/?>)/gi
  const parts = htmlContent.split(regex)
  
  
  for (const part of parts) {
    if (!part || !part.trim()) continue
    
    
    // Handle headings
    if (part.match(/<h1[^>]*>/i)) {
      const content = decodeHTMLEntities(part.replace(/<\/?h1[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim())
      elements.push({ type: 'h1', text: content || ' ', height: 20 })
      // If heading contains <br>, add spacing
      if (part.includes('<br')) {
        elements.push({ type: 'spacing', text: '', height: 8 })
      }
    } else if (part.match(/<h2[^>]*>/i)) {
      const content = decodeHTMLEntities(part.replace(/<\/?h2[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim())
      elements.push({ type: 'h2', text: content || ' ', height: 18 })
      // If heading contains <br>, add spacing
      if (part.includes('<br')) {
        elements.push({ type: 'spacing', text: '', height: 8 })
      }
    } else if (part.match(/<h3[^>]*>/i)) {
      const content = decodeHTMLEntities(part.replace(/<\/?h3[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim())
      elements.push({ type: 'h3', text: content || ' ', height: 16 })
      // If heading contains <br>, add spacing
      if (part.includes('<br')) {
        elements.push({ type: 'spacing', text: '', height: 8 })
      }
    }
    // Handle <br> tags - add spacing element
    else if (part.match(/<br\s*\/?>/i)) {
      elements.push({ type: 'spacing', text: '', height: 4 })
    }
    // Handle ordered lists - extract and process list items
    else if (part.match(/<ol[^>]*>/i)) {
      const listItems = part.match(/<li[^>]*>.*?<\/li>/gi) || []
      let counter = 1
      for (const item of listItems) {
        // Check data-list attribute to determine bullet vs number
        const isBullet = item.match(/data-list=["']bullet["']/i)
        const isOrdered = item.match(/data-list=["']ordered["']/i)
        
        const content = item.replace(/<\/?li[^>]*>/gi, '')
        const processedContent = processFormattedContent(content)
        if (processedContent.length > 0) {
          // Use data-list attribute if present, otherwise use parent tag type
          if (isBullet) {
            processedContent[0].text = `• ${processedContent[0].text}`
          } else {
            processedContent[0].text = `${counter}. ${processedContent[0].text}`
            counter++
          }
    elements.push({
            type: 'normal',
            text: processedContent.map(c => c.text).join(''),
            height: 15,
            formattedParts: processedContent,
            isListItem: true
          })
        }
      }
    }
    // Handle unordered lists - extract and process list items
    else if (part.match(/<ul[^>]*>/i)) {
      const listItems = part.match(/<li[^>]*>.*?<\/li>/gi) || []
      let counter = 1
      for (const item of listItems) {
        // Check data-list attribute to determine bullet vs number
        const isBullet = item.match(/data-list=["']bullet["']/i)
        const isOrdered = item.match(/data-list=["']ordered["']/i)
        
        const content = item.replace(/<\/?li[^>]*>/gi, '')
        const processedContent = processFormattedContent(content)
        if (processedContent.length > 0) {
          // Use data-list attribute if present, otherwise use parent tag type
          if (isOrdered) {
            processedContent[0].text = `${counter}. ${processedContent[0].text}`
            counter++
          } else {
            processedContent[0].text = `• ${processedContent[0].text}`
          }
    elements.push({
            type: 'normal',
            text: processedContent.map(c => c.text).join(''),
            height: 15,
            formattedParts: processedContent,
            isListItem: true
          })
        }
      }
    }
    // Handle paragraphs with alignment
    else if (part.match(/<p[^>]*class="[^"]*ql-align-center/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
      const processedContent = processFormattedContent(content)
      const fontSize = extractFontSize(part)
      const fontFamily = extractFontFamily(part)
      if (processedContent.length > 0) {
        elements.push({
          type: 'normal',
          text: processedContent.map(c => c.text).join(''),
          height: 15,
          align: 'center',
          fontSize,
          fontFamily,
          formattedParts: processedContent
        })
      }
    } else if (part.match(/<p[^>]*class="[^"]*ql-align-right/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
      const processedContent = processFormattedContent(content)
      const fontSize = extractFontSize(part)
      const fontFamily = extractFontFamily(part)
      if (processedContent.length > 0) {
        elements.push({
          type: 'normal',
          text: processedContent.map(c => c.text).join(''),
          height: 15,
          align: 'right',
          fontSize,
          fontFamily,
          formattedParts: processedContent
        })
      }
    } else if (part.match(/<p[^>]*class="[^"]*ql-align-justify/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
      const processedContent = processFormattedContent(content)
      const fontSize = extractFontSize(part)
      const fontFamily = extractFontFamily(part)
      if (processedContent.length > 0) {
        elements.push({
          type: 'normal',
          text: processedContent.map(c => c.text).join(''),
          height: 15,
          align: 'justify',
          fontSize,
          fontFamily,
          formattedParts: processedContent
        })
      }
    }
    // Handle regular paragraphs - add spacing for natural line breaks
    else if (part.match(/<p[^>]*>/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
      const processedContent = processFormattedContent(content)
      const fontSize = extractFontSize(part)
      const fontFamily = extractFontFamily(part)
      if (processedContent.length > 0) {
        elements.push({
          type: 'normal',
          text: processedContent.map(c => c.text).join(''),
          height: 15,
          fontSize,
          fontFamily,
          formattedParts: processedContent
        })
        // Add minimal spacing after paragraph for natural line breaks (copy-paste content)
        elements.push({ type: 'spacing', text: '', height: 3 })
      }
    }
  }
  
  elements.forEach((el, i) => {
  })
  
  return elements
}

// Helper function to extract font size from HTML
const extractFontSize = (html: string): number | undefined => {
  // Check for size class (e.g., ql-size-14px, ql-size-large, ql-size-small)
  const sizeClassMatch = html.match(/class="[^"]*ql-size-(\d+px|\w+)[^"]*"/i)
  if (sizeClassMatch) {
    const sizeValue = sizeClassMatch[1]
    console.log('📏 [Download] extractFontSize - Found size class:', sizeValue)
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
    console.log('📏 [Download] extractFontSize - Found inline style font-size:', styleFontSize[1])
    return parseInt(styleFontSize[1], 10)
  }
  
  console.log('📏 [Download] extractFontSize - No font size found in:', html.substring(0, 100))
  return undefined
}

// Helper function to extract font family from class attribute
const extractFontFamily = (htmlString: string): string | undefined => {
  const classMatch = htmlString.match(/class="([^"]*)"/i)
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
      return fontMap[fontName] || 'helvetica'
    }
  }
  return undefined
}

// Helper function to process formatted content while preserving order
const processFormattedContent = (content: string) => {
  const parts: Array<{ text: string; isBold: boolean; isItalic: boolean; fontSize?: number; fontFamily?: string }> = []
  
  console.log('📝 [Download] processFormattedContent input:', content.substring(0, 200))
  
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
    
    console.log('📝 [Download] Segment:', segment.substring(0, 100), '| fontSize:', fontSize, '| fontFamily:', fontFamily)
    
    // Check what type of formatting this segment has
    if (segment.match(/<span[^>]*>/i)) {
      // Span tag (may contain font styles)
      const text = decodeHTMLEntities(segment.replace(/<[^>]*>/g, ''))
      if (text) {
        // Check if the span contains bold/italic tags inside
        const isBold = segment.includes('<strong>') || segment.includes('<b>')
        const isItalic = segment.includes('<em>') || segment.includes('<i>')
        console.log('📝 [Download] Adding span part:', { text: text.substring(0, 30), isBold, isItalic, fontSize, fontFamily })
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
    '&bdquo;': '\u201E',
    '&rarr;': '→',
    '&#8594;': '→',
    '&rarr': '→'
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
