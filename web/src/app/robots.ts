import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexingOff } from "@/lib/seo/metadata";

// Rendered per request, so the sitemap URL follows SITE_URL at runtime, not at build time.
export const dynamic = "force-dynamic";

const PRIVATE_PATHS = ["/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  // A preview copy: public pages stay open, because the bots that build link previews in chat apps
  // obey robots.txt and show an empty card when they are blocked. The pages' noindex meta tag and
  // the proxy's X-Robots-Tag header keep the copy out of search results. No sitemap for a preview.
  if (isIndexingOff()) return { rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
