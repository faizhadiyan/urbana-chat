/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://urbana-ai-production.up.railway.app/api/:path*',
        basePath: false,
      },
    ];
  },
  // Disable className mismatch warning in development
  reactStrictMode: false,
};

module.exports = nextConfig;
