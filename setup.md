# PDF Template Builder - Setup Guide

## Quick Setup Steps

### 1. Environment Configuration
Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Database Setup
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL to create all necessary tables and policies

### 3. Supabase Storage Setup
1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `pdf-images`
3. Set the bucket to public (for image access)

### 4. Run the Application
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Features Available

✅ **User Authentication** - Sign up/Sign in with Supabase Auth  
✅ **CAPTCHA Verification** - Security verification after login  
✅ **PDF Size Selection** - Choose from A4, A3, Letter, Legal, A5  
✅ **Preset Management** - Create reusable PDF templates  
✅ **Image Upload** - Header/footer images with dimension validation  
✅ **Rich Text Editor** - Format content with React Quill  
✅ **PDF Generation** - Generate and download PDFs  

## Troubleshooting

### PostCSS Configuration Error
If you encounter PostCSS errors, ensure the `postcss.config.js` file uses CommonJS syntax:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Missing Dependencies
If you encounter missing dependency errors, run:
```bash
npm install
```

### Build Errors
If you encounter build errors, try:
```bash
npm run build
```

This will show detailed error messages to help identify issues.
