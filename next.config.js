/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    suppressHydrationWarning: true,
  },
  // Suppress hydration warnings for browser extensions
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization.minimize = false;
    }
    return config;
  },
}

module.exports = nextConfig
