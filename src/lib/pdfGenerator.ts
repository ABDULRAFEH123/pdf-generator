export const generatePDF = async (
  presetId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; pdfId?: string; error?: string }> => {
  try {
    console.log('\n=== PDF GENERATION REQUEST DEBUG ===')
    console.log('🚀 Starting PDF Generation...')
    console.log('- Preset ID:', presetId)
    console.log('- User ID:', userId)
    console.log('- Content length:', content.length, 'characters')
    console.log('- Content preview:', content.substring(0, 150) + '...')
    console.log('\n=== FULL CONTENT BEING SENT ===')
    console.log('Raw content:')
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
    
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        presetId,
        content,
        userId
      }),
    })
    
    console.log('📡 API Response status:', response.status, response.statusText)

    const contentType = response.headers.get('content-type') || ''
    const rawBody = await response.text()
    const result: any = contentType.includes('application/json')
      ? (() => {
          try {
            return JSON.parse(rawBody)
          } catch {
            return { error: rawBody }
          }
        })()
      : { error: rawBody }
    console.log('📄 API Response data:', result)
      
    if (!response.ok) {
      console.error('❌ API Error:', result)
      const serverMessage =
        (result && (result.error || result.message || result.details)) ||
        rawBody ||
        `${response.status} ${response.statusText}`
      throw new Error(serverMessage)
    }
    
    console.log('✅ PDF Generated successfully! ID:', result.pdfId)
    
    // Return the PDF ID instead of downloading
    return {
      success: true,
      pdfId: result.pdfId
    }
  } catch (error) {
    console.error('💥 Error generating PDF:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF'
    }
  }
}
