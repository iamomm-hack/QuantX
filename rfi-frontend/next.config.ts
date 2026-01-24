import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  // Disable Turbopack if needed (uncomment the line below)
  // experimental: {
  //   turbo: false,
  // },
};

export default nextConfig;
