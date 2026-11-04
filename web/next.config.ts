import type { NextConfig } from "next";

// Read at build time: the production build needs the real SITE_URL.
const siteUrl = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;
// Local use only: forwards /api/* to the API when no web server (Caddy) sits in front. Also read at build time.
const apiProxyOrigin = process.env.API_PROXY_ORIGIN?.trim().replace(/\/+$/, "") || null;

// Headers of every admin page: never cached, never framed, referrer only inside the site.
const ADMIN_HEADERS = [
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
];

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
  async rewrites() {
    // afterFiles, not fallback: it runs after the real files (so /api/revalidate keeps its own handler) but
    // before the dynamic [lang] routes, which would otherwise answer 404 for /api/auth/csrf and never reach a fallback.
    return {
      afterFiles: apiProxyOrigin
        ? [{ source: "/api/:path*", destination: `${apiProxyOrigin}/api/:path*` }]
        : [],
    };
  },
  async headers() {
    return [{ source: "/admin/:path*", headers: ADMIN_HEADERS }];
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
