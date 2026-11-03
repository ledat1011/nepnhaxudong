import type { NextConfig } from "next";

// Read at build time: the production build needs the real SITE_URL.
const siteUrl = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
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
