export const generatePDF = async (
  presetId: string,
  content: string,
  userId: string
): Promise<void> => {
  try {
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
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate PDF')
    }
    
    // Download the PDF
    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${result.pdf}`
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}
