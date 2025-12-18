import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { generatePDFFromHTML } from '@/lib/htmlToPdf'

interface GeneratePDFRequest {
  presetId: string
  content: string
  userId: string
  pdfName?: string
  // Preset details needed for client-side generation
  headerImageUrl?: string
  footerImageUrl?: string
  headerHeight: number
  footerHeight: number
  pdfWidth: number
  pdfHeight: number
}

interface GeneratePDFResponse {
  success: boolean
  pdfId?: string
  error?: string
  message?: string
}

/**
 * New PDF generation hook that generates PDFs client-side using html2canvas.
 * This ensures the PDF looks exactly like the preview (WYSIWYG).
 */
export function usePDFGenerationV2() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: GeneratePDFRequest): Promise<GeneratePDFResponse> => {
      const {
        presetId,
        content,
        userId,
        pdfName,
        headerImageUrl,
        footerImageUrl,
        headerHeight,
        footerHeight,
        pdfWidth,
        pdfHeight
      } = request

      // Step 1: Generate PDF blob client-side
      console.log('📄 Generating PDF client-side with html2canvas...')
      const pdfBlob = await generatePDFFromHTML({
        content,
        headerImageUrl,
        footerImageUrl,
        headerHeight,
        footerHeight,
        pdfWidth,
        pdfHeight,
        pdfName: pdfName || 'document'
      })
      console.log('✅ PDF blob generated, size:', pdfBlob.size)

      // Step 2: Upload the PDF blob to the server
      const formData = new FormData()
      formData.append('pdf', pdfBlob, `${pdfName || 'document'}.pdf`)
      formData.append('presetId', presetId)
      formData.append('content', content)
      formData.append('userId', userId)
      formData.append('pdfName', pdfName || `PDF - ${new Date().toLocaleDateString()}`)

      console.log('📤 Uploading PDF to server...')
      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save PDF')
      }
      
      console.log('✅ PDF saved successfully:', result)
      return result
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch PDFs for this user
      queryClient.invalidateQueries({ queryKey: ['pdfs', variables.userId] })
      toast.success(data.message || 'PDF generated successfully!')
    },
    onError: (error: Error) => {
      console.error('❌ PDF generation error:', error)
      toast.error(error.message || 'Failed to generate PDF')
    },
  })
}
