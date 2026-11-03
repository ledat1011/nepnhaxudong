import type { NextConfig } from "next";

// Read at build time: the production build needs the real SITE_URL.
const siteUrl = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;

const nextConfig: NextConfig = {
  // The e2e tests build into their own directories, so their caches never mix.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // The root layout sits under [lang], so the app needs its own full-document 404.
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: siteUrl
      ? [
          {
            protocol: siteUrl.protocol === "https:" ? "https" : "http",
            hostname: siteUrl.hostname,
            port: siteUrl.port,
            pathname: "/media/**",
          },
        ]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
