-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create PDF sizes table
CREATE TABLE pdf_sizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  description TEXT
);

-- Insert standard PDF sizes
INSERT INTO pdf_sizes (id, name, width, height, description) VALUES
('a4', 'A4', 2480, 3508, 'Standard document size (2480 × 3508 pixels)'),
('a3', 'A3', 3508, 4961, 'Large document size (3508 × 4961 pixels)'),
('letter', 'Letter', 2550, 3300, 'US Letter size (2550 × 3300 pixels)'),
('legal', 'Legal', 2550, 4200, 'US Legal size (2550 × 4200 pixels)'),
('a5', 'A5', 1748, 2480, 'Small document size (1748 × 2480 pixels)');

-- Create presets table
CREATE TABLE presets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  pdf_size_id TEXT NOT NULL REFERENCES pdf_sizes(id),
  header_image_url TEXT NOT NULL,
  footer_image_url TEXT NOT NULL,
  header_height INTEGER NOT NULL DEFAULT 300,
  footer_height INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create PDF documents table
CREATE TABLE pdf_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  preset_id UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  captcha_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_presets_user_id ON presets(user_id);
CREATE INDEX idx_presets_pdf_size_id ON presets(pdf_size_id);
CREATE INDEX idx_pdf_documents_user_id ON pdf_documents(user_id);
CREATE INDEX idx_pdf_documents_preset_id ON pdf_documents(preset_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own presets" ON presets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets" ON presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" ON presets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" ON presets
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own PDF documents" ON pdf_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF documents" ON pdf_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF documents" ON pdf_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF documents" ON pdf_documents
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, captcha_verified)
  VALUES (NEW.id, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdf_documents_updated_at
  BEFORE UPDATE ON pdf_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
