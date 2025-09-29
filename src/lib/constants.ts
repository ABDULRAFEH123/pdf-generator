import { PDFSize } from '@/types'

export const PDF_SIZES: PDFSize[] = [
  {
    id: 'a4',
    name: 'A4',
    width: 2480,
    height: 3508,
    description: 'Standard document size (2480 × 3508 pixels)'
  },
  {
    id: 'a3',
    name: 'A3',
    width: 3508,
    height: 4961,
    description: 'Large document size (3508 × 4961 pixels)'
  },
  {
    id: 'letter',
    name: 'Letter',
    width: 2550,
    height: 3300,
    description: 'US Letter size (2550 × 3300 pixels)'
  },
  {
    id: 'legal',
    name: 'Legal',
    width: 2550,
    height: 4200,
    description: 'US Legal size (2550 × 4200 pixels)'
  },
  {
    id: 'a5',
    name: 'A5',
    width: 1748,
    height: 2480,
    description: 'Small document size (1748 × 2480 pixels)'
  }
]

export const HEADER_HEIGHT = 300
export const FOOTER_HEIGHT = 300
