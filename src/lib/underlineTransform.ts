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
    // COMMENTED OUT: Now showing underline under all characters including descenders
    // const descenderChars = new Set(['y', 'q', 'p', 'j', 'g', 'Y', 'Q', 'J'])
    const descenderChars = new Set<string>([])
    
    const textContent = htmlEl.textContent || ''
    const gapEm = '0.0em' // Minimal gap for preview
    const underlineHeightEm = '1px' // 1px equivalent
    
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
            bottom: 0px;
            left: 0;
            right: 0;
            height: ${underlineHeightEm};
            background-color: ${originalColor};
          `
          charWrapper.appendChild(underlineBar)
        }
        
        wordWrapper.appendChild(charWrapper)
      }
      
      htmlEl.appendChild(wordWrapper)
    })
    
    // Mark as transformed to prevent double-processing
    htmlEl.setAttribute('data-underline-transformed', 'true')
  })
}
