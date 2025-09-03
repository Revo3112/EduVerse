import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-avatar"],
  },

  // Bundle optimization
  webpack: (config) => {
    // Tree shake unused imports
    config.optimization = {
      ...config.optimization,
      providedExports: true,
      usedExports: true,
      sideEffects: false,
    };
    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },

  // Compression
  compress: true,

  // Power optimization for build
  poweredByHeader: false,

  // Static optimization
  trailingSlash: false,
};

export default nextConfig;
