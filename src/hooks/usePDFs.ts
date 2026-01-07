import { useQuery } from '@tanstack/react-query'

interface PDFDocument {
  id: string
  content: string
  created_at: string
  updated_at: string
  pdf_name?: string
  presets: {
    name: string
    header_image_url: string
    footer_image_url: string
    header_height: number
    footer_height: number
    pdf_sizes: {
      name: string
      width: number
      height: number
    }
  }
}

interface PDFsResponse {
  success: boolean
  pdfs: PDFDocument[]
}

export function usePDFs(userId: string | undefined) {
  return useQuery({
    queryKey: ['pdfs', userId],
    queryFn: async (): Promise<PDFsResponse> => {
      const response = await fetch(`/api/pdf/user?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch PDFs')
      }
      return response.json()
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
