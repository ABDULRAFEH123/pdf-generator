/**
 * Transform underline elements to skip descender characters (y, q, p, j, g).
 * This ensures consistent underline rendering between preview and PDF output.
 * Character-by-character approach to match htmlToPdf.ts behavior.
 */
export function transformUnderlineElements(container: HTMLElement): void {
  const underlineElements = container.querySelectorAll('u')
  
  underlineElements.forEach((el) => {
    const htmlEl = el as HTMLElement
    
    // Skip if already transformed
    if (htmlEl.getAttribute('data-underline-transformed') === 'true') return
    
    // Get computed styles
    const computed = window.getComputedStyle(htmlEl)
    const fontSize = parseFloat(computed.fontSize) || 14
    const originalFontSize = htmlEl.style.fontSize || computed.fontSize
    const originalFontWeight = computed.fontWeight
    const originalColor = computed.color || '#000'
    
    // Characters with descenders that should NOT have underline
    const descenderChars = new Set(['y', 'q', 'p', 'j', 'g', 'Y', 'Q', 'J'])
    
    const textContent = htmlEl.textContent || ''
    const gapEm = '0.0em' // Minimal gap for preview
    const underlineHeightEm = '0.07em' // 1px equivalent
    
    // Clear the element
    htmlEl.innerHTML = ''
    htmlEl.style.cssText = `
      text-decoration: none;
      border-bottom: none;
      display: inline;
      font-size: ${originalFontSize};
    `
    
    // Process each character
    for (let i = 0; i < textContent.length; i++) {
      const char = textContent[i]
      const hasDescender = descenderChars.has(char)
      
      // Create wrapper for each character
      const charWrapper = document.createElement('span')
      charWrapper.style.cssText = `
        display: inline-block;
        position: relative;
        font-size: ${originalFontSize};
        font-weight: ${originalFontWeight};
        color: ${originalColor};
        line-height: 1;
        vertical-align: baseline;
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
          bottom: -2px;
          left: 0;
          right: 0;
          height: ${underlineHeightEm};
          background-color: ${originalColor};
        `
        charWrapper.appendChild(underlineBar)
      }
      
      htmlEl.appendChild(charWrapper)
    }
    
    // Mark as transformed to prevent double-processing
    htmlEl.setAttribute('data-underline-transformed', 'true')
  })
}
