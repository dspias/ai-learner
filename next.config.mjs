/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow running the production server inside Docker.
  output: "standalone",
};

export default nextConfig;
