'use client'

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface PDFGeneratorOptions {
  content: string
  headerImageUrl?: string
  footerImageUrl?: string
  headerHeight: number
  footerHeight: number
  pdfWidth: number
  pdfHeight: number
  pdfName: string
}

/**
 * Generates a PDF by capturing HTML content as an image.
 * This ensures WYSIWYG - what you see in the preview is exactly what you get in the PDF.
 * Supports multiple pages when content overflows - renders full content then slices into pages.
 */
export async function generatePDFFromHTML(options: PDFGeneratorOptions): Promise<Blob> {
  const {
    content,
    headerImageUrl,
    footerImageUrl,
    headerHeight,
    footerHeight,
    pdfWidth,
    pdfHeight,
    pdfName
  } = options

  // Calculate aspect ratio from original pixel dimensions
  const aspectRatio = pdfHeight / pdfWidth
  
  // Use a reasonable render width for good text quality (similar to preview)
  const renderWidth = 800
  const renderHeight = renderWidth * aspectRatio
  
  // Scale header/footer heights proportionally
  const scaleFactor = renderWidth / pdfWidth
  const scaledHeaderHeight = headerHeight * scaleFactor
  const scaledFooterHeight = footerHeight * scaleFactor
  const scaledContentHeight = renderHeight - scaledHeaderHeight - scaledFooterHeight
  
  // Convert pixel dimensions to mm (assuming 300 DPI for the preset sizes)
  const DPI = 300
  const pdfWidthMM = (pdfWidth * 25.4) / DPI
  const pdfHeightMM = (pdfHeight * 25.4) / DPI
  
  // Calculate content area in mm
  const headerHeightMM = (headerHeight * 25.4) / DPI
  const footerHeightMM = (footerHeight * 25.4) / DPI
  const contentHeightMM = pdfHeightMM - headerHeightMM - footerHeightMM
  
  console.log('📐 PDF Generation Scale:', {
    renderWidth,
    renderHeight: renderHeight.toFixed(0),
    scaledContentHeight: scaledContentHeight.toFixed(0),
    pdfSizeMM: `${pdfWidthMM.toFixed(2)}×${pdfHeightMM.toFixed(2)}mm`,
    contentHeightMM: contentHeightMM.toFixed(2),
    pdfFormat: `${pdfWidth}×${pdfHeight}px`
  })

  // Calculate padding - apply padding INSIDE the content area, not on the container
  // Letter size (2550 × 3300) needs extra horizontal padding as content appears too wide
  const isLetterSize = pdfWidth === 2550 && pdfHeight === 3300
  const horizontalPadding = isLetterSize ? 100 : 60 // 100px for Letter, 60px for others
  const verticalPadding = 15  // 15px padding on top and bottom
  const contentInnerWidth = renderWidth - (horizontalPadding * 2) // Actual text area width
  
  console.log('📏 Content padding:', {
    isLetterSize,
    horizontalPadding,
    verticalPadding,
    renderWidth,
    contentInnerWidth
  })

  // Step 1: Render the FULL content (no height limit) to measure and capture everything
  // Create outer container at full renderWidth
  const contentContainer = document.createElement('div')
  contentContainer.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${renderWidth}px;
    background: white;
    font-family: Arial, sans-serif;
  `
  
  // Create inner content div with padding
  const innerContent = document.createElement('div')
  innerContent.style.cssText = `
    padding: ${verticalPadding}px ${horizontalPadding}px;
    width: 100%;
    box-sizing: border-box;
  `
  innerContent.innerHTML = `<div class="pdf-content-area">${content}</div>`
  contentContainer.appendChild(innerContent)
  
  // DEBUG: Log the actual HTML content to see list structure
  console.log('📝 Content HTML structure:', content.substring(0, 2000))
  
  // Add styles
  const contentStyle = document.createElement('style')
  contentStyle.textContent = getContentStyles()
  contentContainer.appendChild(contentStyle)
  document.body.appendChild(contentContainer)
  
  // Wait for rendering and fonts to load
  await new Promise(resolve => setTimeout(resolve, 150))
  
  // DEBUG: Log underline (<u>) element styles before canvas capture
  const underlineElements = contentContainer.querySelectorAll('u')
  console.log('🔍 UNDERLINE DEBUG: Found', underlineElements.length, 'underline elements')
  underlineElements.forEach((el, index) => {
    const computed = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    console.log(`🔍 Underline #${index + 1} BEFORE transform:`, {
      text: el.textContent?.substring(0, 30),
      display: computed.display,
      textDecoration: computed.textDecoration,
      borderBottom: computed.borderBottom,
      paddingBottom: computed.paddingBottom,
      lineHeight: computed.lineHeight,
      fontSize: computed.fontSize,
      boundingRect: { width: rect.width.toFixed(2), height: rect.height.toFixed(2) },
      innerHTML: el.outerHTML.substring(0, 200)
    })
  })
  
  // DEBUG: Log the actual styles being applied
  const styleEl = contentContainer.querySelector('style')
  if (styleEl) {
    const uStyleMatch = styleEl.textContent?.match(/\.pdf-content-area u \{[^}]+\}/)
    console.log('🔍 Applied <u> CSS rule:', uStyleMatch ? uStyleMatch[0] : 'NOT FOUND')
  }
  
  // WORKAROUND: Split text into characters and skip underline for descenders (y, q, p, j, g)
  // html2canvas doesn't support text-decoration-skip-ink, so we need manual character handling
  console.log('🔧 Applying character-by-character underline (skipping descenders)...')
  
  underlineElements.forEach((el, index) => {
    const htmlEl = el as HTMLElement
    
    // Get computed styles
    const computed = window.getComputedStyle(htmlEl)
    const fontSize = parseFloat(computed.fontSize) || 14
    const originalFontSize = htmlEl.style.fontSize || computed.fontSize
    const originalFontWeight = computed.fontWeight
    const originalColor = computed.color
    
    // Characters with descenders that should NOT have underline
    // COMMENTED OUT: Now showing underline under all characters including descenders
    // const descenderChars = new Set(['y', 'q', 'p', 'j', 'g', 'Y', 'Q', 'J'])
    const descenderChars = new Set<string>([])
    
    const textContent = htmlEl.textContent || ''
    const gapSize = Math.max(5, Math.round(fontSize * 0.35)) // Reduced gap to move underline closer to text
    const underlineHeight = 1 // 1px underline
    
    console.log(`🔧 Underline #${index + 1}:`, {
      text: textContent.substring(0, 30),
      fontSize: fontSize.toFixed(2),
      gapSize,
      totalChars: textContent.length
    })
    
    // Clear the element
    htmlEl.innerHTML = ''
    htmlEl.style.cssText = `
      text-decoration: none;
      border-bottom: none;
      display: inline;
      font-size: ${originalFontSize};
    `
    
    // Split text into words and spaces to prevent word breaking
    const tokens = textContent.split(/(\s+)/)
    
    tokens.forEach(token => {
      if (!token) return
      
      // Create word wrapper to keep word together
      const wordWrapper = document.createElement('span')
      wordWrapper.style.cssText = `
        display: inline-block;
        white-space: nowrap;
      `
      
      // Process each character in the word/space
      for (let i = 0; i < token.length; i++) {
        const char = token[i]
        const hasDescender = descenderChars.has(char)
        
        // Create wrapper for each character
        const charWrapper = document.createElement('span')
        charWrapper.style.cssText = `
          display: inline-block;
          position: relative;
          padding-bottom: ${gapSize}px;
          font-size: ${originalFontSize};
          font-weight: ${originalFontWeight};
          color: ${originalColor};
        `
        
        // Create text span
        const charSpan = document.createElement('span')
        charSpan.style.cssText = 'display: inline; white-space: pre;'
        charSpan.textContent = char
        charWrapper.appendChild(charSpan)
        
        // Only add underline bar if NOT a descender character (spaces get underline)
        if (!hasDescender) {
          const underlineBar = document.createElement('span')
          underlineBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${underlineHeight}px;
            background-color: ${originalColor};
          `
          charWrapper.appendChild(underlineBar)
        }
        
        wordWrapper.appendChild(charWrapper)
      }
      
      htmlEl.appendChild(wordWrapper)
    })
  })
  
  // Log actual computed dimensions
  const computedStyle = window.getComputedStyle(innerContent)
  console.log('📐 Computed inner content:', {
    width: computedStyle.width,
    paddingLeft: computedStyle.paddingLeft,
    paddingRight: computedStyle.paddingRight
  })
  
  // Capture the FULL content as one tall canvas
  // Increased scale to 5 for ultra HD quality (higher = better quality, larger file size)
  const scale = 2
  console.log('🎨 Starting html2canvas capture with scale:', scale)
  console.log('🎨 Container dimensions before capture:', {
    offsetWidth: contentContainer.offsetWidth,
    offsetHeight: contentContainer.offsetHeight,
    scrollHeight: contentContainer.scrollHeight
  })
  
  const fullContentCanvas = await html2canvas(contentContainer, {
    scale: scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: true, // Enable html2canvas logging for debugging
    width: renderWidth, // Force exact width
    onclone: (clonedDoc, clonedElement) => {
      // DEBUG: Check styles in the cloned document (what html2canvas actually renders)
      const clonedUnderlines = clonedElement.querySelectorAll('u')
      console.log('🎨 CLONED DOC: Found', clonedUnderlines.length, 'underline elements in clone')
      clonedUnderlines.forEach((el, index) => {
        // Check for our wrapper structure inside <u>
        // Could be single wrapper (single-line) or multiple word wrappers (multi-line)
        const allWrappers = el.querySelectorAll(':scope > span')
        const firstWrapper = allWrappers[0]
        const underlineBar = firstWrapper?.querySelector('span:last-child')
        
        if (firstWrapper && underlineBar) {
          const wrapperComputed = clonedDoc.defaultView?.getComputedStyle(firstWrapper)
          const barComputed = clonedDoc.defaultView?.getComputedStyle(underlineBar)
          const isMultiWord = allWrappers.length > 1
          console.log(`🎨 Cloned Underline #${index + 1} (${isMultiWord ? 'MULTI-WORD' : 'SINGLE'} DOM structure):`, {
            text: el.textContent?.substring(0, 30),
            wordWrapperCount: allWrappers.length,
            firstWrapper: {
              display: wrapperComputed?.display,
              position: wrapperComputed?.position,
              paddingBottom: wrapperComputed?.paddingBottom
            },
            underlineBar: {
              position: barComputed?.position,
              bottom: barComputed?.bottom,
              height: barComputed?.height,
              backgroundColor: barComputed?.backgroundColor
            }
          })
        } else {
          // Fallback - no wrapper found
          const computed = clonedDoc.defaultView?.getComputedStyle(el)
          console.log(`🎨 Cloned Underline #${index + 1} (NO WRAPPER - unexpected):`, {
            text: el.textContent?.substring(0, 30),
            display: computed?.display,
            innerHTML: el.innerHTML.substring(0, 100)
          })
        }
      })
    }
  })
  
  console.log('🎨 Canvas capture complete:', {
    canvasWidth: fullContentCanvas.width,
    canvasHeight: fullContentCanvas.height
  })
  
  document.body.removeChild(contentContainer)
  
  const totalContentHeight = fullContentCanvas.height / scale
  
  // Verify captured width matches expected
  const capturedWidth = fullContentCanvas.width / scale
  console.log('📐 Canvas dimensions check:', {
    expectedWidth: renderWidth,
    capturedWidth,
    widthMatch: capturedWidth === renderWidth
  })
  
  // Add padding at the bottom of each page to prevent content from being cut off at edges
  const pageBottomPadding = 20 // 20px padding at bottom of each page content area
  const usableContentHeight = scaledContentHeight - pageBottomPadding
  
  // Find all safe break points (whitespace rows) in the content canvas
  const safeBreakPoints = findSafeBreakPoints(fullContentCanvas, scale)
  console.log('📍 Found safe break points:', safeBreakPoints.length)
  
  // Calculate page breaks using safe break points
  const pageBreaks = calculatePageBreaks(
    totalContentHeight,
    usableContentHeight,
    safeBreakPoints,
    scale
  )
  
  const numPages = pageBreaks.length
  
  console.log('📏 Content captured:', {
    canvasSize: `${fullContentCanvas.width}×${fullContentCanvas.height}px`,
    totalContentHeight,
    scaledContentHeight,
    usableContentHeight,
    pageBottomPadding,
    numPages,
    pageBreaks: pageBreaks.map((pb: PageBreak) => ({ start: pb.startY, end: pb.endY, height: pb.endY - pb.startY }))
  })
  
  // Step 2: Pre-load header and footer images
  let headerCanvas: HTMLCanvasElement | null = null
  let footerCanvas: HTMLCanvasElement | null = null
  
  if (headerImageUrl) {
    headerCanvas = await loadImageToCanvas(headerImageUrl, renderWidth, scaledHeaderHeight, scale)
  }
  
  if (footerImageUrl) {
    footerCanvas = await loadImageToCanvas(footerImageUrl, renderWidth, scaledFooterHeight, scale)
  }
  
  // Step 3: Create PDF and add pages
  const pdf = new jsPDF({
    orientation: pdfWidthMM > pdfHeightMM ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfWidthMM, pdfHeightMM]
  })
  
  console.log('\n📊 ===== PDF GENERATION SUMMARY =====')
  console.log('📊 Underline elements found:', underlineElements.length)
  console.log('📊 Total pages to generate:', numPages)
  console.log('📊 If underlines appear without gap in PDF, check:')
  console.log('  1. "Cloned Underline" logs - do styles match original?')
  console.log('  2. "AFTER gradient transform" logs - is backgroundImage set?')
  console.log('  3. Canvas dimensions - is content properly captured?')
  console.log('=================================\n')
  
  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const pageBreak = pageBreaks[pageNum]
    console.log(`📄 Creating page ${pageNum + 1}/${numPages}...`, {
      startY: pageBreak.startY,
      endY: pageBreak.endY,
      sliceHeight: pageBreak.endY - pageBreak.startY
    })
    
    if (pageNum > 0) {
      pdf.addPage()
    }
    
    // Create a canvas for this page
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = renderWidth * scale
    pageCanvas.height = renderHeight * scale
    const ctx = pageCanvas.getContext('2d')!
    
    // Fill white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    
    // Draw header
    if (headerCanvas) {
      ctx.drawImage(headerCanvas, 0, 0)
    }
    
    // Draw content slice for this page using smart page breaks
    const contentYOffset = pageBreak.startY * scale
    const contentSliceHeight = (pageBreak.endY - pageBreak.startY) * scale
    
    if (contentSliceHeight > 0) {
      // Debug: Log exact drawing dimensions
      console.log(`📄 Page ${pageNum + 1} drawing:`, {
        fullContentCanvasWidth: fullContentCanvas.width,
        pageCanvasWidth: pageCanvas.width,
        widthMatch: fullContentCanvas.width === pageCanvas.width,
        contentYOffset,
        contentSliceHeight,
        destY: scaledHeaderHeight * scale
      })
      
      // Draw content WITHOUT stretching - keep 1:1 ratio to preserve padding
      ctx.drawImage(
        fullContentCanvas,
        0, contentYOffset,                           // Source x, y
        fullContentCanvas.width, contentSliceHeight, // Source width, height
        0, scaledHeaderHeight * scale,               // Dest x, y
        fullContentCanvas.width, contentSliceHeight  // Dest width, height - MUST match source
      )
    }
    
    // Draw footer
    if (footerCanvas) {
      ctx.drawImage(footerCanvas, 0, (renderHeight - scaledFooterHeight) * scale)
    }
    
    // Add page to PDF
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.82)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMM, pdfHeightMM)
  }
  
  console.log('✅ PDF generation complete!')
  
  return pdf.output('blob')
}

/**
 * Loads an image URL and draws it to a canvas at the specified size
 */
async function loadImageToCanvas(
  url: string, 
  width: number, 
  height: number, 
  scale: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas)
    }
    img.onerror = () => {
      // Return empty canvas on error
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      resolve(canvas)
    }
    img.src = url
  })
}

/**
 * Interface for page break info
 */
interface PageBreak {
  startY: number
  endY: number
}

/**
 * Scans the canvas to find rows that are entirely white/empty (safe break points).
 * These are the best places to split pages without cutting through text.
 * Returns Y positions (in unscaled pixels) where it's safe to break.
 */
function findSafeBreakPoints(canvas: HTMLCanvasElement, scale: number): number[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  
  const safeBreaks: number[] = []
  const width = canvas.width
  const height = canvas.height
  
  // Sample every few pixels for performance (check every 2nd row)
  const rowStep = 2
  // Minimum white row thickness to consider it a safe break (in scaled pixels)
  const minWhiteRowThickness = 4 * scale
  
  let consecutiveWhiteRows = 0
  let whiteRowStart = -1
  
  for (let y = 0; y < height; y += rowStep) {
    const imageData = ctx.getImageData(0, y, width, 1)
    const data = imageData.data
    
    // Check if this row is "white enough" (all pixels are very light)
    let isWhiteRow = true
    for (let x = 0; x < width * 4; x += 16) { // Sample every 4th pixel for speed
      const r = data[x]
      const g = data[x + 1]
      const b = data[x + 2]
      // Consider it white if RGB values are all above 250
      if (r < 250 || g < 250 || b < 250) {
        isWhiteRow = false
        break
      }
    }
    
    if (isWhiteRow) {
      if (whiteRowStart === -1) {
        whiteRowStart = y
      }
      consecutiveWhiteRows += rowStep
    } else {
      // End of white region - if it was thick enough, mark the middle as a safe break
      if (consecutiveWhiteRows >= minWhiteRowThickness && whiteRowStart !== -1) {
        const breakPoint = Math.floor((whiteRowStart + y) / 2 / scale)
        safeBreaks.push(breakPoint)
      }
      consecutiveWhiteRows = 0
      whiteRowStart = -1
    }
  }
  
  // Handle trailing white rows at end
  if (consecutiveWhiteRows >= minWhiteRowThickness && whiteRowStart !== -1) {
    const breakPoint = Math.floor((whiteRowStart + height) / 2 / scale)
    safeBreaks.push(breakPoint)
  }
  
  return safeBreaks
}

/**
 * Calculates page breaks using safe break points.
 * Tries to fit as much content as possible per page while only breaking at safe points.
 */
function calculatePageBreaks(
  totalContentHeight: number,
  usableContentHeight: number,
  safeBreakPoints: number[],
  scale: number
): PageBreak[] {
  const pageBreaks: PageBreak[] = []
  let currentStart = 0
  
  while (currentStart < totalContentHeight) {
    // Target end position for this page
    const targetEnd = currentStart + usableContentHeight
    
    // If remaining content fits on this page, take it all
    if (targetEnd >= totalContentHeight) {
      pageBreaks.push({
        startY: currentStart,
        endY: totalContentHeight
      })
      break
    }
    
    // Find the best safe break point before the target end
    // Look for a break point between 70% and 100% of the target range
    const minBreakY = currentStart + (usableContentHeight * 0.7)
    const maxBreakY = targetEnd
    
    let bestBreak = -1
    for (const breakPoint of safeBreakPoints) {
      if (breakPoint > currentStart && breakPoint >= minBreakY && breakPoint <= maxBreakY) {
        bestBreak = breakPoint
      }
      if (breakPoint > maxBreakY) break
    }
    
    // If no safe break found in range, look for ANY safe break after minBreakY
    if (bestBreak === -1) {
      for (const breakPoint of safeBreakPoints) {
        if (breakPoint > currentStart && breakPoint <= maxBreakY) {
          bestBreak = breakPoint
        }
        if (breakPoint > maxBreakY) break
      }
    }
    
    // If still no safe break found, fall back to target end (might cut text)
    // But try to find ANY break point nearby
    if (bestBreak === -1) {
      // Last resort: find closest break point to target
      let closestBreak = -1
      let closestDist = Infinity
      for (const breakPoint of safeBreakPoints) {
        if (breakPoint > currentStart) {
          const dist = Math.abs(breakPoint - targetEnd)
          if (dist < closestDist && dist < usableContentHeight * 0.3) {
            closestDist = dist
            closestBreak = breakPoint
          }
        }
      }
      bestBreak = closestBreak !== -1 ? closestBreak : targetEnd
    }
    
    pageBreaks.push({
      startY: currentStart,
      endY: bestBreak
    })
    
    currentStart = bestBreak
  }
  
  // Ensure we have at least one page
  if (pageBreaks.length === 0) {
    pageBreaks.push({
      startY: 0,
      endY: totalContentHeight
    })
  }
  
  return pageBreaks
}

/**
 * Returns the CSS styles for PDF content
 */
function getContentStyles(): string {
  return `
    .pdf-content-area {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #000;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: normal;
    }
    .pdf-content-area p {
      margin: 0 0 0.5em 0;
      line-height: inherit;
      min-height: 1.5em;
    }
    /* Preserve empty paragraphs - Quill creates <p><br></p> for empty lines */
    .pdf-content-area p:empty,
    .pdf-content-area p br:only-child {
      display: block;
      min-height: 1.5em;
    }
    .pdf-content-area br {
      display: block;
      content: "";
      margin-top: 0;
    }
    .pdf-content-area h1 {
      font-size: 2em;
      font-weight: bold;
      margin: 0 0 0.5em 0;
    }
    .pdf-content-area h2 {
      font-size: 1.5em;
      font-weight: bold;
      margin: 0 0 0.5em 0;
    }
    .pdf-content-area h3 {
      font-size: 1.17em;
      font-weight: bold;
      margin: 0 0 0.5em 0;
    }
    .pdf-content-area ul, .pdf-content-area ol {
      margin: 0 0 0.5em 0;  
      padding-left: 2em;
      list-style-position: outside;
    }
    .pdf-content-area li {
      margin: 0.25em 0;
      line-height: 1.6;
      display: list-item;
      padding-left: 0.3em;
    }
    .pdf-content-area ul > li {
      list-style-type: disc;
    }
    .pdf-content-area ol > li {
      list-style-type: decimal;
    }
    /* Quill specific: ol with data-list="bullet" should show bullets */
    .pdf-content-area ol > li[data-list="bullet"] {
      list-style-type: none !important;
    }
    .pdf-content-area ol > li[data-list="bullet"]::before {
      content: "•";
      display: inline-block;
      width: 1em;
      margin-left: -1.3em;
      font-size: 1em;
      line-height: 1;
    }
    /* Quill specific: ol/ul with data-list="ordered" should show numbers */
    .pdf-content-area ol > li[data-list="ordered"],
    .pdf-content-area ul > li[data-list="ordered"] {
      list-style-type: none !important;
      counter-increment: list-counter;
    }
    .pdf-content-area ol > li[data-list="ordered"]::before,
    .pdf-content-area ul > li[data-list="ordered"]::before {
      content: counter(list-counter) ".";
      display: inline-block;
      width: 1.5em;
      margin-left: -1.8em;
      font-size: 1em;
      line-height: 1;
    }
    /* Reset counter for each list */
    .pdf-content-area ol, .pdf-content-area ul {
      counter-reset: list-counter;
    }
    .pdf-content-area ul > li[data-list="bullet"] {
      list-style-type: disc !important;
    }
    .pdf-content-area strong, .pdf-content-area b {
      font-weight: bold;
    }
    .pdf-content-area em, .pdf-content-area i {
      font-style: italic;
    }
    /* UNDERLINE FIX: html2canvas doesn't properly render padding-bottom on inline elements */
    /* Using em units so underline scales with font size - matches PDFPreview.css */
    /* Note: The actual rendering uses JS workaround that overrides these styles */
    .pdf-content-area u {
      text-decoration: none;
      border-bottom: 0.07em solid #000;
      display: inline;
      padding-bottom: 0.21em;
      line-height: 1.8;
    }
    /* Alternative: wrap content in span with block behavior for multi-line underlines */
    .pdf-content-area u > * {
      display: inline;
    }
    .pdf-content-area s {
      text-decoration: line-through;
    }
    .pdf-content-area a {
      color: #2563eb;
      text-decoration: underline;
    }
    .pdf-content-area blockquote {
      border-left: 4px solid #d1d5db;
      padding-left: 1em;
      margin: 0.5em 0;
      color: #4b5563;
    }
    .pdf-content-area pre, .pdf-content-area code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }
    
    /* Quill Font Family Classes - must match PDFEditor.tsx whitelist */
    .pdf-content-area .ql-font-sans-serif { font-family: Arial, Helvetica, sans-serif; }
    .pdf-content-area .ql-font-times-new-roman { font-family: 'Times New Roman', Times, serif; }
    .pdf-content-area .ql-font-courier-new { font-family: 'Courier New', Courier, monospace; }
    .pdf-content-area .ql-font-impact { font-family: Impact, Charcoal, sans-serif; }
    .pdf-content-area .ql-font-robotoserif { font-family: 'Roboto Serif', Georgia, serif; }
    .pdf-content-area .ql-font-verdana { font-family: Verdana, Geneva, sans-serif; }
    .pdf-content-area .ql-font-opensans { font-family: 'Open Sans', Arial, sans-serif; }
    .pdf-content-area .ql-font-lato { font-family: Lato, 'Helvetica Neue', sans-serif; }
    .pdf-content-area .ql-font-robotomono { font-family: 'Roboto Mono', 'Courier New', monospace; }
    .pdf-content-area .ql-font-georgia { font-family: Georgia, 'Times New Roman', serif; }
    .pdf-content-area .ql-font-cambria { font-family: Cambria, Georgia, serif; }
    .pdf-content-area .ql-font-garamond { font-family: Garamond, 'Times New Roman', serif; }
    .pdf-content-area .ql-font-arial { font-family: Arial, Helvetica, sans-serif; }
    .pdf-content-area .ql-font-calibri { font-family: Calibri, 'Segoe UI', sans-serif; }
    
    /* Quill Indent Classes */
    .pdf-content-area .ql-indent-1 { padding-left: 3em; }
    .pdf-content-area .ql-indent-2 { padding-left: 6em; }
    .pdf-content-area .ql-indent-3 { padding-left: 9em; }
    .pdf-content-area .ql-indent-4 { padding-left: 12em; }
    .pdf-content-area .ql-indent-5 { padding-left: 15em; }
    
    /* Quill Alignment Classes */
    .pdf-content-area .ql-align-center { text-align: center; }
    .pdf-content-area .ql-align-right { text-align: right; }
    .pdf-content-area .ql-align-justify { text-align: justify; }
    
    /* Quill Color Classes - common colors */
    .pdf-content-area .ql-color-red { color: red; }
    .pdf-content-area .ql-color-orange { color: orange; }
    .pdf-content-area .ql-color-yellow { color: yellow; }
    .pdf-content-area .ql-color-green { color: green; }
    .pdf-content-area .ql-color-blue { color: blue; }
    .pdf-content-area .ql-color-purple { color: purple; }
    
    /* Quill Background Color Classes */
    .pdf-content-area .ql-bg-red { background-color: red; }
    .pdf-content-area .ql-bg-orange { background-color: orange; }
    .pdf-content-area .ql-bg-yellow { background-color: yellow; }
    .pdf-content-area .ql-bg-green { background-color: green; }
    .pdf-content-area .ql-bg-blue { background-color: blue; }
    .pdf-content-area .ql-bg-purple { background-color: purple; }
    
    /* Ensure inline styles are preserved - Quill uses inline styles for colors and sizes */
    .pdf-content-area [style] { /* Inline styles take precedence */ }
    .pdf-content-area span[style*="font-size"] { line-height: 1.4; }
    .pdf-content-area span[style*="color"] { /* Color from inline style */ }
    .pdf-content-area span[style*="background"] { padding: 0 2px; }
  `
}

/**
 * Downloads a PDF generated from HTML content
 */
export async function downloadPDFFromHTML(options: PDFGeneratorOptions): Promise<void> {
  const blob = await generatePDFFromHTML(options)
  
  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${options.pdfName || 'document'}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
