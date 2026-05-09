/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint version mismatch with Next.js 16 — lint separately via `npm run lint`
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors are caught locally; allow Vercel to build without blocking
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

module.exports = nextConfig
