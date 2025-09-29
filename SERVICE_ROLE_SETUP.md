# Service Role Key Setup

## The Issue
The server-side API routes need the **Service Role Key** to access Supabase Storage with admin privileges. Currently, they're using the anonymous key which doesn't have permission to create buckets or upload files.

## Solution: Add Service Role Key

### Step 1: Get Your Service Role Key
1. Go to your **Supabase Dashboard**
2. Click on **"Settings"** in the left sidebar
3. Click on **"API"**
4. Find the **"service_role"** key (NOT the anon key)
5. Copy the service role key

### Step 2: Add to Environment Variables
Create a `.env.local` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Restart Your Development Server
After adding the service role key:
1. Stop your development server (Ctrl+C)
2. Run `npm run dev` again
3. Test the image upload

## Important Notes
- **NEVER** commit the service role key to version control
- The service role key has full admin access to your Supabase project
- Only use it in server-side code (API routes)
- The `.env.local` file is automatically ignored by Git

## Test After Setup
Once you've added the service role key:
1. Go to `http://localhost:3000/api/test-storage`
2. You should see the `pdf-images` bucket listed
3. Try uploading an image in your app

## Alternative: Use Client-Side Upload
If you prefer not to use the service role key, we can modify the upload to work client-side instead of server-side.
