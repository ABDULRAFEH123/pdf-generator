-- Migration to add missing columns to pdf_documents table
-- Run this in your Supabase SQL editor

-- Add missing columns to pdf_documents table
ALTER TABLE pdf_documents 
ADD COLUMN IF NOT EXISTS pdf_data TEXT,
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS pdf_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pdf_documents.pdf_data IS 'Base64 encoded PDF file data';
COMMENT ON COLUMN pdf_documents.filename IS 'Original filename of the PDF document';
COMMENT ON COLUMN pdf_documents.pdf_name IS 'User-provided name for the PDF document';
