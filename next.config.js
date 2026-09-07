/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
};
module.exports = nextConfig;
