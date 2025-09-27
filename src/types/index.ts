export interface PDFSize {
  id: string
  name: string
  width: number
  height: number
  description: string
}

export interface Preset {
  id: string
  name: string
  pdf_size_id: string
  header_image_url: string
  footer_image_url: string
  header_height: number
  footer_height: number
  created_at: string
  updated_at: string
  user_id: string
}

export interface PDFDocument {
  id: string
  preset_id: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface User {
  id: string
  email: string
  created_at: string
  captcha_verified: boolean
}

export interface ImageUpload {
  file: File
  type: 'header' | 'footer'
  dimensions: {
    width: number
    height: number
  }
}
