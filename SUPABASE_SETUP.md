# Supabase Database Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `pdf-template-builder`
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

## Step 2: Get Your Project Credentials

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## Step 3: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy and paste the entire contents of `database-schema.sql`
4. Click "Run" to execute the schema

## Step 5: Set Up Storage

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Enter bucket name: `pdf-images`
4. Make it **Public** (uncheck "Private bucket")
5. Click "Create bucket"

## Step 6: Configure Storage Policies

1. Go to **Storage** → **policies**
2. Click "New Policy" for the `pdf-images` bucket
3. Add this policy:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pdf-images' AND
  auth.role() = 'authenticated'
);

-- Allow public access to images
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'pdf-images');
```

## Step 7: Test Your Setup

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Try to sign up for a new account

4. Check your Supabase dashboard:
   - **Authentication** → **Users** should show your new user
   - **Table Editor** → **user_profiles** should have a new record

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Check your environment variables
2. **"Bucket not found"**: Make sure the `pdf-images` bucket exists and is public
3. **"Permission denied"**: Check your RLS policies
4. **"Table doesn't exist"**: Run the database schema again

### Database Schema Overview:

- **pdf_sizes**: Standard PDF dimensions (A4, A3, etc.)
- **presets**: User-created PDF templates
- **pdf_documents**: Generated PDF records
- **user_profiles**: User profile information including CAPTCHA verification

### Security Features:

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic user profile creation on signup
- CAPTCHA verification tracking

## Next Steps

Once your database is set up:

1. **Test Authentication**: Sign up and sign in
2. **Test CAPTCHA**: Complete the verification step
3. **Create a Preset**: Upload header/footer images
4. **Generate PDF**: Create and download a PDF

Your PDF Template Builder is now ready to use! 🎉
