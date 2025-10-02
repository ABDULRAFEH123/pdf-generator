/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'your-supabase-project.supabase.co'],
  },
  // Suppress ReactQuill warnings in development
  reactStrictMode: true,
}

module.exports = nextConfig
