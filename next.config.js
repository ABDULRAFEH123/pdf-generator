/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'your-supabase-project.supabase.co'],
  },
  // Suppress ReactQuill warnings in development
  reactStrictMode: true,
  experimental: {
    suppressHydrationWarning: true,
  },
}

module.exports = nextConfig
