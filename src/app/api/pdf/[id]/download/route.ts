import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jsPDF from 'jspdf'

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
    
    console.log('\n=== PDF DOWNLOAD GENERATION DEBUG ===')
    console.log('PDF ID:', id)
    console.log('Preset:', preset?.name)
    console.log('Size (px):', { width: preset.pdf_sizes.width, height: preset.pdf_sizes.height })
    console.log('Content length:', pdfDoc.content.length)
    console.log('Content preview:', pdfDoc.content.substring(0, 200) + '...')
    console.log('\n=== FULL CONTENT DEBUG ===')
    console.log('Raw HTML content:')
    console.log(pdfDoc.content)
    console.log('\n=== CONTENT ANALYSIS ===')
    console.log('Contains <p> tags:', pdfDoc.content.includes('<p>'))
    console.log('Contains <br> tags:', pdfDoc.content.includes('<br>'))
    console.log('Contains <h1> tags:', pdfDoc.content.includes('<h1>'))
    console.log('Contains <h2> tags:', pdfDoc.content.includes('<h2>'))
    console.log('Contains <h3> tags:', pdfDoc.content.includes('<h3>'))
    console.log('Contains <ul> tags:', pdfDoc.content.includes('<ul>'))
    console.log('Contains <ol> tags:', pdfDoc.content.includes('<ol>'))
    console.log('Contains <li> tags:', pdfDoc.content.includes('<li>'))
    console.log('Contains <strong> tags:', pdfDoc.content.includes('<strong>'))
    console.log('Contains <em> tags:', pdfDoc.content.includes('<em>'))
    
    // Count different elements
    const pMatches = pdfDoc.content.match(/<p[^>]*>/gi) || []
    const brMatches = pdfDoc.content.match(/<br\s*\/?>/gi) || []
    const h1Matches = pdfDoc.content.match(/<h1[^>]*>/gi) || []
    const h2Matches = pdfDoc.content.match(/<h2[^>]*>/gi) || []
    const h3Matches = pdfDoc.content.match(/<h3[^>]*>/gi) || []
    const ulMatches = pdfDoc.content.match(/<ul[^>]*>/gi) || []
    const olMatches = pdfDoc.content.match(/<ol[^>]*>/gi) || []
    const liMatches = pdfDoc.content.match(/<li[^>]*>/gi) || []
    
    console.log('\n=== ELEMENT COUNTS ===')
    console.log('Paragraphs (<p>):', pMatches.length)
    console.log('Line breaks (<br>):', brMatches.length)
    console.log('H1 headings:', h1Matches.length)
    console.log('H2 headings:', h2Matches.length)
    console.log('H3 headings:', h3Matches.length)
    console.log('Unordered lists (<ul>):', ulMatches.length)
    console.log('Ordered lists (<ol>):', olMatches.length)
    console.log('List items (<li>):', liMatches.length)
    
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
    
    console.log('\n=== DOWNLOAD PDF GENERATION DEBUG ===')
    console.log('- Page dimensions (mm):', { pageWidth, pageHeight })
    console.log('- Header/Footer heights (mm):', { headerHeight, footerHeight })
    console.log('- Content area:', { x: margin, y: headerHeight + margin, width: textWidth, height: textHeight })
    console.log('- Content length:', pdfDoc.content.length, 'characters')
    
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
    const filename = `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`

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
  
  console.log('\n=== DOWNLOAD TEXT RENDERING DEBUG ===')
  console.log('Rendering options:', options)

  // Helper function to add header and footer to any page
  const addHeaderAndFooterToPage = async (pdf: jsPDF, pageNumber: number) => {
    console.log(`📄 Adding header and footer to page ${pageNumber}`)
    
    // Add header image
    if (headerImageUrl) {
      try {
        const headerImg = await loadImage(headerImageUrl)
        pdf.addImage(headerImg, 'JPEG', 0, 0, pageWidth, headerHeight)
        console.log(`✅ Header added to page ${pageNumber}`)
      } catch (error) {
        console.error(`❌ Failed to load header image for page ${pageNumber}:`, error)
      }
    }

    // Add footer image
    if (footerImageUrl) {
      try {
        const footerImg = await loadImage(footerImageUrl)
        pdf.addImage(footerImg, 'JPEG', 0, pageHeight - footerHeight, pageWidth, footerHeight)
        console.log(`✅ Footer added to page ${pageNumber}`)
      } catch (error) {
        console.error(`❌ Failed to load footer image for page ${pageNumber}:`, error)
      }
    }
  }
  
  // Parse HTML content and convert to formatted text
  const parsedContent = parseHTMLContent(htmlContent)
  
  console.log('Starting to render', parsedContent.length, 'elements')
  
  let currentY = y
  let currentPage = 1
  let renderedElements = 0
  let lastElementType = ''
  
  for (const element of parsedContent) {
    console.log(`\n--- Processing Element ${renderedElements} ---`)
    console.log('Element type:', element.type)
    console.log('Element text preview:', element.text.substring(0, 100) + (element.text.length > 100 ? '...' : ''))
    console.log('Element text length:', element.text.length)
    console.log('Current Y position:', currentY)
    console.log('Current page:', currentPage)
    
    // Minimal spacing between different content types
    if (lastElementType && lastElementType !== element.type && element.type !== 'spacing') {
      console.log(`🟡 ELEMENT TRANSITION: ${lastElementType} -> ${element.type}`)
      // Only add minimal spacing for major content type changes
      if (lastElementType === 'h1' || lastElementType === 'h2' || lastElementType === 'h3') {
        currentY += 2 // Minimal spacing after headings
        console.log(`🟡 SPACING: Added 2mm after ${lastElementType}, Y: ${currentY - 2} -> ${currentY}`)
      } else if (element.type === 'h1' || element.type === 'h2' || element.type === 'h3') {
        currentY += 1 // Minimal spacing before headings
        console.log(`🟡 SPACING: Added 1mm before ${element.type}, Y: ${currentY - 1} -> ${currentY}`)
      } else {
        console.log(`🟡 SPACING: No spacing added for ${lastElementType} -> ${element.type}`)
      }
      // Remove all other spacing - let the content flow naturally
    }
    
    // Handle spacing elements (br tags)
    if (element.type === 'spacing') {
      console.log('Adding br tag spacing')
      currentY += brSpacing
      continue
    }
    
    // Check if we need a new page
    if (currentY + element.height > pageHeight - footerHeight - margin) {
      console.log('Adding new page - Y position would exceed page bounds')
      pdf.addPage()
      currentPage++
      
      // Add header and footer to the new page
      await addHeaderAndFooterToPage(pdf, currentPage)
      
      currentY = headerHeight + margin
      console.log('New page created, current page:', currentPage, 'Y reset to:', currentY)
    }
    
    // Handle headings with proper font sizes and wrapping
    if (element.type === 'h1' || element.type === 'h2' || element.type === 'h3') {
      console.log(`Rendering ${element.type} heading:`, element.text)
      pdf.setFont('helvetica', 'bold')
      const fontSize = element.type === 'h1' ? 24 : element.type === 'h2' ? 20 : 16
      pdf.setFontSize(fontSize)
      console.log('Font size set to:', fontSize)
      
      // Wrap heading text if needed
      const wrappedLines = splitTextToLines(pdf, element.text, width)
      console.log(`Heading wrapped into ${wrappedLines.length} lines:`, wrappedLines)
      
      for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i]
        
        // Handle alignment for headings
        let textX = x
        if (element.align === 'center') {
          textX = x + (width - pdf.getTextWidth(line)) / 2
        } else if (element.align === 'right') {
          textX = x + width - pdf.getTextWidth(line)
        }
        
        console.log(`🔵 HEADING LINE: Rendering "${line}" at (${textX}, ${currentY})`)
        pdf.text(line, textX, currentY)
        console.log(`🔵 HEADING LINE: After pdf.text(), Y position: ${currentY}`)
        
        // Add line spacing except for last line
        if (i < wrappedLines.length - 1) {
          currentY += (fontSize * 0.3) // Proportional line height for headings
          console.log(`Added line spacing, new Y: ${currentY}`)
          
          // Check if we need a new page
          if (currentY + (fontSize * 0.3) > pageHeight - footerHeight - margin) {
            console.log('Need new page for next heading line')
            pdf.addPage()
            currentPage++
            await addHeaderAndFooterToPage(pdf, currentPage)
            currentY = headerHeight + margin
          }
        }
      }
      
      // Add proper spacing after headings to prevent overlapping
      currentY += (fontSize * 0.5) // Add 50% of font size as spacing
      console.log(`Heading ${element.type} rendered, added ${fontSize * 0.5}mm spacing, new Y: ${currentY}`)
      renderedElements++
      continue
    }
    
    // Handle list items
    if (element.type === 'list-item') {
      console.log('Rendering list item:', element.text)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(14)
      
      const wrappedLines = splitTextToLines(pdf, element.text, width)
      console.log(`List item wrapped into ${wrappedLines.length} lines:`, wrappedLines)
      
      for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i]
        console.log(`🟣 LIST LINE: Rendering "${line}" at (${x}, ${currentY})`)
        pdf.text(line, x, currentY)
        console.log(`🟣 LIST LINE: After pdf.text(), Y position: ${currentY}`)
        
        if (i < wrappedLines.length - 1) {
          currentY += lineHeight // Add line height after each line
          console.log(`Added line spacing (${lineHeight}mm), new Y: ${currentY}`)
          
          if (currentY + lineHeight > pageHeight - footerHeight - margin) {
            console.log('Need new page for next list line')
            pdf.addPage()
            currentPage++
            await addHeaderAndFooterToPage(pdf, currentPage)
            currentY = headerHeight + margin
          }
        }
      }
      
      // No extra spacing after list items - spacing is handled by the main loop
      console.log(`List item rendered, new Y: ${currentY}`)
      renderedElements++
      continue
    }
    
    // Handle regular text with proper wrapping
    if (element.text) {
      console.log('Rendering regular text, has formatted parts:', !!element.formattedParts)
      
      // Use formatted parts if available, otherwise use simple text
      if (element.formattedParts && element.formattedParts.length > 0) {
        console.log('Using formatted parts, count:', element.formattedParts.length)
        
        // Handle formatted text with wrapping and get the new Y position
        const newY = await addFormattedTextWithWrapping(pdf, element.formattedParts, x, currentY, width, element.align)
        currentY = newY
        console.log(`Formatted text rendered, new Y: ${currentY}`)
      } else {
        console.log('Using simple text fallback')
        
        // Fallback for simple text with wrapping
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(14)
        
        const wrappedLines = splitTextToLines(pdf, element.text, width)
        console.log(`Simple text wrapped into ${wrappedLines.length} lines:`, wrappedLines)
        
        for (let i = 0; i < wrappedLines.length; i++) {
          const line = wrappedLines[i]
          
          // Handle alignment
          let textX = x
          if (element.align === 'center') {
            textX = x + (width - pdf.getTextWidth(line)) / 2
          } else if (element.align === 'right') {
            textX = x + width - pdf.getTextWidth(line)
          }
          
          console.log(`🟠 SIMPLE LINE: Rendering "${line}" at (${textX}, ${currentY})`)
          pdf.text(line, textX, currentY)
          console.log(`🟠 SIMPLE LINE: After pdf.text(), Y position: ${currentY}`)
          
          // Add line spacing except for last line
          if (i < wrappedLines.length - 1) {
            currentY += lineHeight // Add line height after each line
            console.log(`Added line spacing (${lineHeight}mm), new Y: ${currentY}`)
            
            // Check if we need a new page
            if (currentY + lineHeight > pageHeight - footerHeight - margin) {
              console.log('Need new page for next text line')
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
      console.log(`Added line height ${lineHeight}mm after normal text, new Y: ${currentY}`)
    }
    
    // Update last element type for spacing logic
    lastElementType = element.type
    renderedElements++
  }
  
  console.log('\n=== DOWNLOAD RENDERING COMPLETE ===')
  console.log('Total elements processed:', renderedElements)
  console.log('Final Y position:', currentY)
  console.log('Total pages created:', currentPage)
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

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = pdf.getTextWidth(testLine)

    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        // Single word is too long, break it
        lines.push(word)
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
  formattedParts: Array<{ text: string; isBold: boolean; isItalic: boolean }>, 
  x: number, 
  startY: number, 
  maxWidth: number, 
  align?: string
): Promise<number> => {
  console.log('\n=== DOWNLOAD FORMATTED TEXT WRAPPING DEBUG ===')
  console.log('Start Y position:', startY)
  console.log('Max width:', maxWidth)
  console.log('Formatted parts count:', formattedParts.length)
  formattedParts.forEach((part, i) => {
    console.log(`  Part ${i}: "${part.text}" (bold: ${part.isBold}, italic: ${part.isItalic})`)
  })
  
  let currentY = startY
  let currentX = x
  let currentLine = ''
  let currentLineWidth = 0
  const lineHeight = 6 // Base line height in mm
  const parts: Array<{ text: string; x: number; isBold: boolean; isItalic: boolean }> = []
  
  console.log('Initial line height set to:', lineHeight, 'mm')

  // Build the full text with formatting info
  for (const part of formattedParts) {
    const words = part.text.split(' ')
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const spaceNeeded = i === 0 && currentLine === '' ? '' : ' '
      const testText = spaceNeeded + word
      
      // Set font to measure correctly
      let fontStyle = 'normal'
      if (part.isBold && part.isItalic) {
        fontStyle = 'bolditalic'
      } else if (part.isBold) {
        fontStyle = 'bold'
      } else if (part.isItalic) {
        fontStyle = 'italic'
      }
      pdf.setFont('helvetica', fontStyle)
      pdf.setFontSize(14)
      
      const testWidth = pdf.getTextWidth(testText)
      
      if (currentLineWidth + testWidth <= maxWidth) {
        // Word fits on current line
        currentLine += testText
        currentLineWidth += testWidth
      } else {
        // Word doesn't fit, start new line
        if (currentLine) {
          // Render current line
          console.log(`🔴 DOWNLOAD LINE BREAK: Rendering line "${currentLine}" at Y: ${currentY}`)
          await renderLine(pdf, parts, x, currentY, maxWidth, align)
          parts.length = 0
          console.log(`🔴 DOWNLOAD LINE BREAK: Adding lineHeight ${lineHeight}mm to Y position`)
          currentY += lineHeight
          console.log(`🔴 DOWNLOAD LINE BREAK: New Y position: ${currentY}`)
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
          isItalic: part.isItalic
        })
      }
    }
  }

  // Render remaining line
  if (currentLine && parts.length > 0) {
    console.log(`🟢 DOWNLOAD FINAL LINE: Rendering final line "${currentLine}" at Y: ${currentY}`)
    await renderLine(pdf, parts, x, currentY, maxWidth, align)
  }

  console.log(`🟢 DOWNLOAD FORMATTED TEXT COMPLETE: Final Y position: ${currentY}`)
  return currentY
}

// Helper function to render a line with mixed formatting
const renderLine = async (
  pdf: jsPDF,
  parts: Array<{ text: string; x: number; isBold: boolean; isItalic: boolean }>,
  x: number,
  y: number,
  maxWidth: number,
  align?: string
) => {
  if (parts.length === 0) return

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
    pdf.setFont('helvetica', fontStyle)
    pdf.setFontSize(14)
    totalWidth += pdf.getTextWidth(part.text + ' ')
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
    
    pdf.setFont('helvetica', fontStyle)
    pdf.setFontSize(14)
    console.log(`🔸 DOWNLOAD RENDER PART: "${part.text}" at (${currentX}, ${y})`)
    pdf.text(part.text, currentX, y)
    const textWidth = pdf.getTextWidth(part.text + ' ')
    console.log(`🔸 DOWNLOAD RENDER PART: Text width: ${textWidth}, moving X: ${currentX} -> ${currentX + textWidth}`)
    currentX += textWidth
  }
}

const parseHTMLContent = (htmlContent: string) => {
  const elements: Array<{
    type: string
    text: string
    height: number
    align?: string
    formattedParts?: Array<{ text: string; isBold: boolean; isItalic: boolean }>
  }> = []
  
  // Parse HTML in order by splitting on tags and processing sequentially
  const regex = /(<h1[^>]*>.*?<\/h1>|<h2[^>]*>.*?<\/h2>|<h3[^>]*>.*?<\/h3>|<p[^>]*>.*?<\/p>|<ol[^>]*>.*?<\/ol>|<ul[^>]*>.*?<\/ul>|<br\s*\/?>)/gi
  const parts = htmlContent.split(regex)
  
  console.log('\n=== HTML PARSING DEBUG ===')
  console.log('Total parts after split:', parts.length)
  
  for (const part of parts) {
    if (!part || !part.trim()) continue
    
    console.log('\n--- Parsing part:', part.substring(0, 150))
    
    // Handle headings
    if (part.match(/<h1[^>]*>/i)) {
      const content = part.replace(/<\/?h1[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim()
      console.log('✅ Added H1:', content || '(empty)')
      elements.push({ type: 'h1', text: content || ' ', height: 20 })
      // If heading contains <br>, add spacing
      if (part.includes('<br')) {
        console.log('✅ Added spacing after empty H1 with <br>')
        elements.push({ type: 'spacing', text: '', height: 8 })
      }
    } else if (part.match(/<h2[^>]*>/i)) {
      const content = part.replace(/<\/?h2[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim()
      console.log('✅ Added H2:', content || '(empty)')
      elements.push({ type: 'h2', text: content || ' ', height: 18 })
      // If heading contains <br>, add spacing
      if (part.includes('<br')) {
        console.log('✅ Added spacing after empty H2 with <br>')
        elements.push({ type: 'spacing', text: '', height: 8 })
      }
    } else if (part.match(/<h3[^>]*>/i)) {
      const content = part.replace(/<\/?h3[^>]*>/gi, '').replace(/<[^>]*>/g, '').trim()
      console.log('✅ Added H3:', content || '(empty)')
      elements.push({ type: 'h3', text: content || ' ', height: 16 })
      // If heading contains <br>, add spacing
      if (part.includes('<br')) {
        console.log('✅ Added spacing after empty H3 with <br>')
        elements.push({ type: 'spacing', text: '', height: 8 })
      }
    }
    // Handle <br> tags - add spacing element
    else if (part.match(/<br\s*\/?>/i)) {
      console.log('✅ Added BR spacing')
      elements.push({ type: 'spacing', text: '', height: 4 })
    }
    // Handle ordered lists - extract and process list items
    else if (part.match(/<ol[^>]*>/i)) {
      console.log('📋 Processing OL LIST (checking data-list attribute)')
      const listItems = part.match(/<li[^>]*>.*?<\/li>/gi) || []
      console.log('Found', listItems.length, 'list items')
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
            console.log('✅ Added bullet list item (data-list=bullet):', processedContent.map(c => c.text).join(''))
          } else {
            processedContent[0].text = `${counter}. ${processedContent[0].text}`
            console.log(`✅ Added ordered list item ${counter} (parent=ol):`, processedContent.map(c => c.text).join(''))
            counter++
          }
    elements.push({
            type: 'normal',
            text: processedContent.map(c => c.text).join(''),
            height: 15,
            formattedParts: processedContent
          })
        }
      }
    }
    // Handle unordered lists - extract and process list items
    else if (part.match(/<ul[^>]*>/i)) {
      console.log('📋 Processing UL LIST (checking data-list attribute)')
      const listItems = part.match(/<li[^>]*>.*?<\/li>/gi) || []
      console.log('Found', listItems.length, 'list items')
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
            console.log(`✅ Added ordered list item ${counter} (data-list=ordered):`, processedContent.map(c => c.text).join(''))
            counter++
          } else {
            processedContent[0].text = `• ${processedContent[0].text}`
            console.log('✅ Added bullet list item (parent=ul):', processedContent.map(c => c.text).join(''))
          }
    elements.push({
            type: 'normal',
            text: processedContent.map(c => c.text).join(''),
            height: 15,
            formattedParts: processedContent
          })
        }
      }
    }
    // Handle paragraphs with alignment
    else if (part.match(/<p[^>]*class="[^"]*ql-align-center/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
    const processedContent = processFormattedContent(content)
    if (processedContent.length > 0) {
        console.log('✅ Added center-aligned paragraph:', processedContent.map(c => c.text).join(''))
      elements.push({
        type: 'normal',
        text: processedContent.map(c => c.text).join(''),
        height: 15,
        align: 'center',
        formattedParts: processedContent
      })
    }
    } else if (part.match(/<p[^>]*class="[^"]*ql-align-right/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
    const processedContent = processFormattedContent(content)
    if (processedContent.length > 0) {
        console.log('✅ Added right-aligned paragraph:', processedContent.map(c => c.text).join(''))
      elements.push({
        type: 'normal',
        text: processedContent.map(c => c.text).join(''),
        height: 15,
        align: 'right',
        formattedParts: processedContent
      })
    }
    } else if (part.match(/<p[^>]*class="[^"]*ql-align-justify/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
    const processedContent = processFormattedContent(content)
    if (processedContent.length > 0) {
        console.log('✅ Added justified paragraph:', processedContent.map(c => c.text).join(''))
      elements.push({
        type: 'normal',
        text: processedContent.map(c => c.text).join(''),
        height: 15,
        align: 'justify',
        formattedParts: processedContent
      })
    }
    }
    // Handle regular paragraphs - add spacing for natural line breaks
    else if (part.match(/<p[^>]*>/i)) {
      const content = part.replace(/<\/?p[^>]*>/gi, '')
    const processedContent = processFormattedContent(content)
    if (processedContent.length > 0) {
        console.log('✅ Added paragraph with natural line break:', processedContent.map(c => c.text).join('').substring(0, 100))
      elements.push({
        type: 'normal',
        text: processedContent.map(c => c.text).join(''),
        height: 15,
        formattedParts: processedContent
      })
        // Add minimal spacing after paragraph for natural line breaks (copy-paste content)
        elements.push({ type: 'spacing', text: '', height: 3 })
      }
    }
  }
  
  console.log('\n=== PARSED ELEMENTS ===')
  console.log('Total elements:', elements.length)
  elements.forEach((el, i) => {
    console.log(`Element ${i}: ${el.type} - "${el.text?.substring(0, 80)}${el.text && el.text.length > 80 ? '...' : ''}"`)
  })
  
  return elements
}

// Helper function to process formatted content while preserving order
const processFormattedContent = (content: string) => {
  const parts: Array<{ text: string; isBold: boolean; isItalic: boolean }> = []
  
  // Remove underline tags but keep the content
  content = content.replace(/<\/?u[^>]*>/gi, '')
  
  // Parse HTML in order to preserve text sequence
  const regex = /(<strong[^>]*><em[^>]*>.*?<\/em><\/strong>|<em[^>]*><strong[^>]*>.*?<\/strong><\/em>|<strong[^>]*>.*?<\/strong>|<b[^>]*>.*?<\/b>|<em[^>]*>.*?<\/em>|<i[^>]*>.*?<\/i>|[^<]+)/gi
  
  let match
  while ((match = regex.exec(content)) !== null) {
    const segment = match[0]
    
    // Check what type of formatting this segment has
    if (segment.match(/<strong[^>]*><em[^>]*>|<em[^>]*><strong[^>]*>/i)) {
      // Bold + Italic
      const text = segment.replace(/<[^>]*>/g, '')
      if (text) {
        parts.push({ text, isBold: true, isItalic: true })
      }
    } else if (segment.match(/<strong[^>]*>|<b[^>]*>/i)) {
      // Bold only
      const text = segment.replace(/<[^>]*>/g, '')
      if (text) {
        parts.push({ text, isBold: true, isItalic: false })
      }
    } else if (segment.match(/<em[^>]*>|<i[^>]*>/i)) {
      // Italic only
      const text = segment.replace(/<[^>]*>/g, '')
      if (text) {
        parts.push({ text, isBold: false, isItalic: true })
      }
    } else if (!segment.match(/<[^>]*>/)) {
      // Plain text (no tags)
      if (segment) {
        parts.push({ text: segment, isBold: false, isItalic: false })
      }
    }
  }
  
  return parts
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
