/**
 * Transform underline elements to use DOM wrappers with absolute positioned underline bars.
 * This ensures consistent underline rendering between preview and PDF output.
 * Uses em units so the underline scales properly with zoomed/scaled containers.
 */
export function transformUnderlineElements(container: HTMLElement): void {
  const underlineElements = container.querySelectorAll('u')
  
  underlineElements.forEach((el) => {
    const htmlEl = el as HTMLElement
    
    // Skip if already transformed
    if (htmlEl.getAttribute('data-underline-transformed') === 'true') return
    
    // Get computed styles to calculate expected single-line height
    const computed = window.getComputedStyle(htmlEl)
    const fontSize = parseFloat(computed.fontSize) || 14
    const lineHeight = parseFloat(computed.lineHeight) || fontSize * 1.5
    
    // Use em units for gap and underline thickness so they scale with the container
    // 0.15em gap ≈ 2px at 14px font, 0.07em underline ≈ 1px at 14px font
    const gapEm = '0.15em'
    const underlineHeightEm = '0.07em'
    
    // Single line height = line-height + some tolerance
    const expectedSingleLineHeight = lineHeight + 10
    
    // Get original dimensions to detect single vs multi-line
    const rectBefore = htmlEl.getBoundingClientRect()
    const isSingleLine = rectBefore.height <= expectedSingleLineHeight
    
    // Preserve original styles
    const originalFontSize = htmlEl.style.fontSize || computed.fontSize
    const originalFontWeight = computed.fontWeight
    const originalColor = computed.color || '#000'
    
    if (isSingleLine) {
      // SINGLE-LINE: Use DOM wrapper approach
      const textContent = htmlEl.innerHTML
      
      const wrapper = document.createElement('span')
      wrapper.style.cssText = `
        display: inline-block;
        position: relative;
        padding-bottom: ${gapEm};
        line-height: 1.5;
        font-size: ${originalFontSize};
        font-weight: ${originalFontWeight};
        color: ${originalColor};
      `
      
      const textSpan = document.createElement('span')
      textSpan.style.cssText = 'display: inline; font-size: inherit; font-weight: inherit; color: inherit;'
      textSpan.innerHTML = textContent
      
      const underlineBar = document.createElement('span')
      underlineBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${underlineHeightEm};
        background-color: ${originalColor};
      `
      
      wrapper.appendChild(textSpan)
      wrapper.appendChild(underlineBar)
      
      htmlEl.innerHTML = ''
      htmlEl.style.cssText = `
        text-decoration: none;
        border-bottom: none;
        padding-bottom: 0;
        display: inline;
        font-size: ${originalFontSize};
      `
      htmlEl.appendChild(wrapper)
    } else {
      // MULTI-LINE: Split text into word-by-word inline-block spans
      const textContent = htmlEl.textContent || ''
      const words = textContent.split(/\s+/).filter(w => w.length > 0)
      
      htmlEl.innerHTML = ''
      htmlEl.style.cssText = `
        text-decoration: none;
        border-bottom: none;
        padding-bottom: 0;
        display: inline;
        font-size: ${originalFontSize};
      `
      
      words.forEach((word, wordIndex) => {
        const isLastWord = wordIndex === words.length - 1
        
        const wordWrapper = document.createElement('span')
        wordWrapper.style.cssText = `
          display: inline-block;
          position: relative;
          padding-bottom: ${gapEm};
          line-height: 1.5;
          font-size: ${originalFontSize};
          font-weight: ${originalFontWeight};
          color: ${originalColor};
        `
        
        const wordTextSpan = document.createElement('span')
        wordTextSpan.style.cssText = 'display: inline; white-space: pre; font-size: inherit; font-weight: inherit; color: inherit;'
        wordTextSpan.textContent = isLastWord ? word : word + ' '
        
        const wordUnderlineBar = document.createElement('span')
        wordUnderlineBar.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: ${underlineHeightEm};
          background-color: ${originalColor};
        `
        
        wordWrapper.appendChild(wordTextSpan)
        wordWrapper.appendChild(wordUnderlineBar)
        htmlEl.appendChild(wordWrapper)
      })
    }
    
    // Mark as transformed to prevent double-processing
    htmlEl.setAttribute('data-underline-transformed', 'true')
  })
}
