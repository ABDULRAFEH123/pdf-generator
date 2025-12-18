-- Migration to add new columns for HTML-to-PDF approach
-- Run this in your Supabase SQL Editor

-- Add pdf_name column for storing custom PDF names
ALTER TABLE pdf_documents 
ADD COLUMN IF NOT EXISTS pdf_name TEXT;

-- Add pdf_url column for storing public URL of stored PDF
ALTER TABLE pdf_documents 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add storage_path column for storing the path in Supabase Storage
ALTER TABLE pdf_documents 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_pdf_documents_storage_path ON pdf_documents(storage_path);

-- Update existing records to have a pdf_name based on created_at if not set
UPDATE pdf_documents 
SET pdf_name = 'PDF Document ' || TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI')
WHERE pdf_name IS NULL;
