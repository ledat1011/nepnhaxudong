import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/metadata";

// Rendered per request, so the sitemap URL follows SITE_URL at runtime, not at build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
