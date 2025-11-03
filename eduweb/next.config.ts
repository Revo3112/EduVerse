import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-avatar",
    ],
  },

  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Konfigurasi fallback untuk Node.js modules di browser
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Optimasi untuk client-side bundles
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        providedExports: true,
        usedExports: true,
        // PENTING: Jangan set sideEffects: false untuk thirdweb
        // karena akan break dynamic wallet imports
        moduleIds: "deterministic",
      };

      // Prevent tree-shaking thirdweb wallet modules
      config.optimization.sideEffects = true;
    }

    // Handle thirdweb wallet modules dengan proper resolution
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    // Rule untuk thirdweb ESM modules
    config.module.rules.push({
      test: /node_modules\/thirdweb\/.*\.js$/,
      resolve: {
        fullySpecified: false,
      },
      type: "javascript/auto",
    });

    // Ensure proper handling of wallet imports
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };

    return config;
  },

  // Transpile thirdweb package untuk compatibility
  transpilePackages: ["thirdweb"],

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipfs.io",
        port: "",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        port: "",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
        port: "",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "copper-far-firefly-220.mypinata.cloud",
        port: "",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "copper-far-firefly-220.mypinata.cloud",
        port: "",
        pathname: "/files/**",
      },
    ],
  },

  // Compression
  compress: true,

  // Power optimization for build
  poweredByHeader: false,

  // Static optimization
  trailingSlash: false,

  // Security headers optimized for development and IPFS content
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";

    return [
      // Header untuk semua halaman - relaxed for development
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: isDevelopment ? "unsafe-none" : "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      // Specific headers for Next.js internal routes
      {
        source: "/_next/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Headers for static assets
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Headers for API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
