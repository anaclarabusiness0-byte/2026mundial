/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'imagensfivers.com' },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: '/app',         destination: '/app/index.html' },
      { source: '/admin-panel', destination: '/admin-panel/index.html' },
    ]
  },
}
module.exports = nextConfig
