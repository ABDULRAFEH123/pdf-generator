import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

interface GeneratePDFRequest {
  presetId: string
  content: string
  userId: string
}

interface GeneratePDFResponse {
  success: boolean
  pdfId?: string
  error?: string
  message?: string
}

export function usePDFGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ presetId, content, userId }: GeneratePDFRequest): Promise<GeneratePDFResponse> => {
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presetId,
          content,
          userId,
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate PDF')
      }
      
      return result
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch PDFs for this user
      queryClient.invalidateQueries({ queryKey: ['pdfs', variables.userId] })
      toast.success(data.message || 'PDF generated successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate PDF')
    },
  })
}
