import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Empty turbopack config to silence the warning
  turbopack: {},
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes for Stellar SDK in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
