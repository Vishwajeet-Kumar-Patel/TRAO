/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@prep-kit/shared'],

  // Expose the backend URL to the browser bundle.
  // Set NEXT_PUBLIC_API_URL in Vercel Dashboard → Environment Variables.
  // Falls back to localhost:5000 for local development.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
};

export default nextConfig;
