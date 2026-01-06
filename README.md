# PDF Template Builder

A Next.js application for creating professional PDF templates with custom headers and footers. Users can create reusable presets and generate PDFs with rich text content.

## Features

- **User Authentication**: Secure sign-up and login with Supabase Auth
- **CAPTCHA Verification**: Security verification after login
- **PDF Size Selection**: Choose from standard PDF sizes (A4, A3, Letter, Legal, A5)
- **Preset Management**: Create and manage reusable PDF templates
- **Image Upload**: Upload header and footer images with dimension validation
- **Rich Text Editor**: Create formatted content using React Quill
- **PDF Generation**: Generate and download PDFs with custom layouts

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **PDF Generation**: jsPDF, html2canvas
- **Rich Text Editor**: React Quill

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pdf-generator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a new bucket called `pdf-images` in Storage
4. Run the SQL schema from `database-schema.sql` in the Supabase SQL editor

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables:

- `pdf_sizes`: Standard PDF dimensions
- `presets`: User-created PDF templates
- `pdf_documents`: Generated PDF documents
- `user_profiles`: User profile information including CAPTCHA verification

## Usage Workflow

1. **Sign Up/Login**: Create an account or sign in
2. **CAPTCHA Verification**: Solve a simple math CAPTCHA for security
3. **Select PDF Size**: Choose from standard PDF sizes (A4, A3, Letter, Legal, A5)
4. **Create Preset**: Upload header and footer images with exact dimensions
5. **Generate PDF**: Use the rich text editor to create content and generate PDFs

## Image Requirements

- **Header Images**: Must be exactly the PDF width × 400px
- **Footer Images**: Must be exactly the PDF width × 400px
- **Supported Formats**: PNG, JPG, GIF
- **Maximum Size**: 5MB per image

## PDF Size Standards

| Size | Dimensions (pixels) | Use Case |
|------|-------------------|----------|
| A4 | 2480 × 3508 | Standard documents |
| A3 | 3508 × 4961 | Large documents |
| Letter | 2550 × 3300 | US Letter format |
| Legal | 2550 × 4200 | US Legal format |
| A5 | 1748 × 2480 | Small documents |

## Development

### Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
└── types/              # TypeScript type definitions
```

### Key Components

- `AuthForm`: User authentication
- `CaptchaVerification`: Security verification
- `PDFSizeSelector`: PDF size selection
- `PresetForm`: Preset creation
- `ImageUpload`: Image upload with validation
- `RichTextEditor`: Content editing
- `PDFCreationModal`: PDF generation
- `Dashboard`: Main application interface

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your preferred platform (Vercel, Netlify, etc.)

3. Set up environment variables in your deployment platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
