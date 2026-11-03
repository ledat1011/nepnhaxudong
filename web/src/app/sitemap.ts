import type { MetadataRoute } from "next";
import { getContentClient } from "@/lib/content/client";
import { getSiteUrl } from "@/lib/seo/metadata";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";

// Rendered per request, so `next build` never calls the content API.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(getContentClient(), getSiteUrl());
}
