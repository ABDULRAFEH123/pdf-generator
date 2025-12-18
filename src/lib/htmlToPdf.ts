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
  const horizontalPadding = 60 // 60px padding on left and right
  const verticalPadding = 15  // 15px padding on top and bottom
  const contentInnerWidth = renderWidth - (horizontalPadding * 2) // Actual text area width
  
  console.log('📏 Content padding:', {
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
  
  // Log actual computed dimensions
  const computedStyle = window.getComputedStyle(innerContent)
  console.log('📐 Computed inner content:', {
    width: computedStyle.width,
    paddingLeft: computedStyle.paddingLeft,
    paddingRight: computedStyle.paddingRight
  })
  
  // Capture the FULL content as one tall canvas
  const scale = 3
  const fullContentCanvas = await html2canvas(contentContainer, {
    scale: scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: renderWidth // Force exact width
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
  
  const numPages = Math.max(1, Math.ceil(totalContentHeight / usableContentHeight))
  
  console.log('📏 Content captured:', {
    canvasSize: `${fullContentCanvas.width}×${fullContentCanvas.height}px`,
    totalContentHeight,
    scaledContentHeight,
    usableContentHeight,
    pageBottomPadding,
    numPages
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
  
  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    console.log(`📄 Creating page ${pageNum + 1}/${numPages}...`)
    
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
    
    // Draw content slice for this page
    // Use usableContentHeight for offset calculation to account for page padding
    const contentYOffset = pageNum * usableContentHeight * scale
    const contentSliceHeight = Math.min(
      usableContentHeight * scale,
      fullContentCanvas.height - contentYOffset
    )
    
    if (contentSliceHeight > 0) {
      // Debug: Log exact drawing dimensions
      console.log(`📄 Page ${pageNum + 1} drawing:`, {
        fullContentCanvasWidth: fullContentCanvas.width,
        pageCanvasWidth: pageCanvas.width,
        widthMatch: fullContentCanvas.width === pageCanvas.width,
        destX: 0,
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
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.95)
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
 * Returns the CSS styles for PDF content
 */
function getContentStyles(): string {
  return `
    .pdf-content-area {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #000;
    }
    .pdf-content-area p {
      margin: 0 0 0.5em 0;
      line-height: inherit;
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
    .pdf-content-area u {
      text-decoration: underline;
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
    .pdf-content-area .ql-indent-1 { padding-left: 3em; }
    .pdf-content-area .ql-indent-2 { padding-left: 6em; }
    .pdf-content-area .ql-indent-3 { padding-left: 9em; }
    .pdf-content-area .ql-indent-4 { padding-left: 12em; }
    .pdf-content-area .ql-indent-5 { padding-left: 15em; }
    .pdf-content-area .ql-align-center { text-align: center; }
    .pdf-content-area .ql-align-right { text-align: right; }
    .pdf-content-area .ql-align-justify { text-align: justify; }
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
