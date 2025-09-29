# Supabase Storage Setup Guide

## The Issue
You're getting "must be owner of table objects" because storage policies need to be set up through the Supabase dashboard, not SQL.

## Solution: Set Up Storage Policies via Dashboard

### Step 1: Go to Storage in Supabase Dashboard
1. Open your Supabase project dashboard
2. Click on **"Storage"** in the left sidebar
3. You should see your buckets

### Step 2: Create the pdf-images Bucket (if it doesn't exist)
1. Click **"Create a new bucket"**
2. Name: `pdf-images`
3. **Make it PUBLIC** (uncheck "Private bucket")
4. Click **"Create bucket"**

### Step 3: Set Up Storage Policies
1. Click on the **"pdf-images"** bucket
2. Go to the **"Policies"** tab
3. Click **"New Policy"**

#### Policy 1: Allow Authenticated Uploads
- **Policy name**: `Allow authenticated uploads`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'pdf-images'`
- **WITH CHECK expression**: `bucket_id = 'pdf-images' AND auth.role() = 'authenticated'`

#### Policy 2: Allow Public Access
- **Policy name**: `Allow public access`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'pdf-images'`

#### Policy 3: Allow Users to Update Own Images
- **Policy name**: `Allow users to update own images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'pdf-images' AND auth.role() = 'authenticated'`

#### Policy 4: Allow Users to Delete Own Images
- **Policy name**: `Allow users to delete own images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'pdf-images' AND auth.role() = 'authenticated'`

### Step 4: Alternative - Use the API Setup
If the dashboard method doesn't work, you can also:

1. Go to `http://localhost:3000/api/setup-bucket`
2. Make a POST request to create the bucket
3. Then set up policies manually in the dashboard

## Quick Test
After setting up the policies, test the upload by:
1. Going to your app
2. Trying to upload an image
3. Check the browser console for any errors

## Troubleshooting
- Make sure the bucket is **PUBLIC**
- Ensure all 4 policies are created
- Check that you're logged in when testing uploads
- Verify the bucket name is exactly `pdf-images`
