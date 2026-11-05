import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexingOff } from "@/lib/seo/metadata";

// Rendered per request, so the sitemap URL follows SITE_URL at runtime, not at build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // A preview copy: keep every crawler out and do not point them to the sitemap.
  if (isIndexingOff()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
