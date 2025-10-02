import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
    
    console.log('\n=== DETAILED SPACING DEBUG ===')
    console.log('- Page dimensions (mm):', { pageWidth, pageHeight })
    console.log('- Header/Footer heights (mm):', { headerHeight, footerHeight })
    console.log('- Content area:', { x: margin, y: headerHeight + margin, width: textWidth, height: textHeight })
    console.log('- Content length:', content.length, 'characters')
    console.log('- Raw content preview:', content.substring(0, 200) + '...')
    
    console.log('\n=== FULL CONTENT DEBUG ===')
    console.log('Raw HTML content:')
    console.log(content)
    console.log('\n=== CONTENT ANALYSIS ===')
    console.log('Contains <p> tags:', content.includes('<p>'))
    console.log('Contains <br> tags:', content.includes('<br>'))
    console.log('Contains <h1> tags:', content.includes('<h1>'))
    console.log('Contains <h2> tags:', content.includes('<h2>'))
    console.log('Contains <h3> tags:', content.includes('<h3>'))
    console.log('Contains <ul> tags:', content.includes('<ul>'))
    console.log('Contains <ol> tags:', content.includes('<ol>'))
    console.log('Contains <li> tags:', content.includes('<li>'))
    console.log('Contains <strong> tags:', content.includes('<strong>'))
    console.log('Contains <em> tags:', content.includes('<em>'))
    
    // Count different elements
    const pMatches = content.match(/<p[^>]*>/gi) || []
    const brMatches = content.match(/<br\s*\/?>/gi) || []
    const h1Matches = content.match(/<h1[^>]*>/gi) || []
    const h2Matches = content.match(/<h2[^>]*>/gi) || []
    const h3Matches = content.match(/<h3[^>]*>/gi) || []
    const ulMatches = content.match(/<ul[^>]*>/gi) || []
    const olMatches = content.match(/<ol[^>]*>/gi) || []
    const liMatches = content.match(/<li[^>]*>/gi) || []
    
    console.log('\n=== ELEMENT COUNTS ===')
    console.log('Paragraphs (<p>):', pMatches.length)
    console.log('Line breaks (<br>):', brMatches.length)
    console.log('H1 headings:', h1Matches.length)
    console.log('H2 headings:', h2Matches.length)
    console.log('H3 headings:', h3Matches.length)
    console.log('Unordered lists (<ul>):', ulMatches.length)
    console.log('Ordered lists (<ol>):', olMatches.length)
    console.log('List items (<li>):', liMatches.length)
    
    await addHTMLContentToPDF(pdf, content, {
      x: margin,
      y: headerHeight + margin,
      width: textWidth,
      maxHeight: textHeight,
      pageHeight,
      footerHeight,
      margin
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
        user_id: userId
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
    margin: number
  }
) => {
  const { x, y, width, maxHeight, pageHeight, footerHeight, margin } = options
  
  console.log('\n=== TEXT RENDERING DEBUG ===')
  console.log('Rendering options:', options)
  
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
    
    // Skip spacing elements
    if (element.type === 'spacing') {
      console.log('Skipping spacing element')
      continue
    }
    
    // Check if we need a new page
    if (currentY + element.height > pageHeight - footerHeight - margin) {
      console.log('Adding new page - Y position would exceed page bounds')
      pdf.addPage()
      currentY = margin
      currentPage++
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
          currentY += (fontSize * 0.0) // Reduced proportional line height
          console.log(`Added line spacing, new Y: ${currentY}`)
          
          // Check if we need a new page
          if (currentY + (fontSize * 0.0) > pageHeight - footerHeight - margin) {
            console.log('Need new page for next heading line')
            pdf.addPage()
            currentY = margin
          }
        }
      }
      
      // No extra spacing after headings - spacing is handled by the main loop
      console.log(`Heading ${element.type} rendered, new Y: ${currentY}`)
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
          currentY += 0 // 0mm line height (tighter spacing)
          console.log(`Added line spacing, new Y: ${currentY}`)
          
          if (currentY + 6 > pageHeight - footerHeight - margin) {
            console.log('Need new page for next list line')
            pdf.addPage()
            currentY = margin
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
            currentY += 0 // 0mm line height (tighter spacing)
            console.log(`Added line spacing, new Y: ${currentY}`)
            
            // Check if we need a new page
            if (currentY + 6 > pageHeight - footerHeight - margin) {
              console.log('Need new page for next text line')
              pdf.addPage()
              currentY = margin
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
  
  console.log('\n=== RENDERING COMPLETE ===')
  console.log('Total elements processed:', renderedElements)
  console.log('Final Y position:', currentY)
  console.log('Total pages created:', currentPage)
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
  console.log('\n=== FORMATTED TEXT WRAPPING DEBUG ===')
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
  const lineHeight = 0 // 0mm line height (tighter spacing like preview)
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
          console.log(`🔴 LINE BREAK: Rendering line "${currentLine}" at Y: ${currentY}`)
          await renderLine(pdf, parts, x, currentY, maxWidth, align)
          parts.length = 0
          console.log(`🔴 LINE BREAK: Adding lineHeight ${lineHeight}mm to Y position`)
          currentY += lineHeight
          console.log(`🔴 LINE BREAK: New Y position: ${currentY}`)
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
    console.log(`🟢 FINAL LINE: Rendering final line "${currentLine}" at Y: ${currentY}`)
    await renderLine(pdf, parts, x, currentY, maxWidth, align)
  }

  console.log(`🟢 FORMATTED TEXT COMPLETE: Final Y position: ${currentY}`)
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
    console.log(`🔸 RENDER PART: "${part.text}" at (${currentX}, ${y})`)
    pdf.text(part.text, currentX, y)
    const textWidth = pdf.getTextWidth(part.text + ' ')
    console.log(`🔸 RENDER PART: Text width: ${textWidth}, moving X: ${currentX} -> ${currentX + textWidth}`)
    currentX += textWidth
  }
  
  // Return the current Y position (no need to calculate lines here)
  return y
}

// Parse HTML content into structured elements
const parseHTMLContent = (htmlContent: string) => {
  console.log('\n=== HTML PARSING DEBUG ===')
  console.log('Input HTML length:', htmlContent.length)
  console.log('Input HTML preview:', htmlContent.substring(0, 300) + '...')
  
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
    const cleanContent = content.replace(/<[^>]*>/g, '').trim()
    
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
          const itemContent = item.replace(/<li[^>]*>|<\/li>/gi, '').replace(/<[^>]*>/g, '').trim()
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
          const itemContent = item.replace(/<li[^>]*>|<\/li>/gi, '').replace(/<[^>]*>/g, '').trim()
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
  
  console.log('\n=== PARSED ELEMENTS DETAILED DEBUG ===')
  console.log('Total elements parsed:', elements.length)
  elements.forEach((el, i) => {
    console.log(`\nElement ${i}:`)
    console.log(`  Type: ${el.type}`)
    console.log(`  Text: "${el.text}"`)
    console.log(`  Text length: ${el.text.length}`)
    console.log(`  Height: ${el.height}mm`)
    console.log(`  Has formatted parts: ${!!el.formattedParts}`)
    if (el.formattedParts) {
      console.log(`  Formatted parts count: ${el.formattedParts.length}`)
      el.formattedParts.forEach((part, j) => {
        console.log(`    Part ${j}: "${part.text}" (bold: ${part.isBold}, italic: ${part.isItalic})`)
      })
    }
  })
  
  return elements
}

// Helper function to process formatted content
const processFormattedContent = (content: string) => {
  const parts: Array<{ text: string; isBold: boolean; isItalic: boolean }> = []
  
  // Handle bold and italic combinations
  content = content.replace(/<strong[^>]*><em[^>]*>(.*?)<\/em><\/strong>/gi, (match, text) => {
    parts.push({ text: text.trim(), isBold: true, isItalic: true })
    return ''
  })
  
  content = content.replace(/<em[^>]*><strong[^>]*>(.*?)<\/strong><\/em>/gi, (match, text) => {
    parts.push({ text: text.trim(), isBold: true, isItalic: true })
    return ''
  })
  
  // Handle bold text
  content = content.replace(/<strong[^>]*>(.*?)<\/strong>/gi, (match, text) => {
    parts.push({ text: text.trim(), isBold: true, isItalic: false })
    return ''
  })
  
  content = content.replace(/<b[^>]*>(.*?)<\/b>/gi, (match, text) => {
    parts.push({ text: text.trim(), isBold: true, isItalic: false })
    return ''
  })
  
  // Handle italic text
  content = content.replace(/<em[^>]*>(.*?)<\/em>/gi, (match, text) => {
    parts.push({ text: text.trim(), isBold: false, isItalic: true })
    return ''
  })
  
  content = content.replace(/<i[^>]*>(.*?)<\/i>/gi, (match, text) => {
    parts.push({ text: text.trim(), isBold: false, isItalic: true })
    return ''
  })
  
  // Handle remaining text
  const remainingText = content.replace(/<[^>]*>/g, '').trim()
  if (remainingText) {
    parts.push({ text: remainingText, isBold: false, isItalic: false })
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
