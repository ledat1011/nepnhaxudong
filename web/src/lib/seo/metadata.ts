import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n/langs";

export const SITE_NAME = "Nếp Nhà";

const DEFAULT_SITE_URL = "http://localhost:3000";

const OG_LOCALE: Record<Lang, string> = { vi: "vi_VN", en: "en_US" };

type Env = Record<string, string | undefined>;

// Read at call time, so one build can run with different SITE_URL values.
export function getSiteUrl(env: Env = process.env): URL {
  return new URL(env.SITE_URL || DEFAULT_SITE_URL);
}

export function withSiteName(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

type BuildMetadataInput = {
  lang: Lang;
  title: string;
  description: string;
  /** Path of the same page in every language. Relative; Next resolves it with `metadataBase`. */
  paths: Record<Lang, string>;
  type?: "website" | "article";
  publishedTime?: string;
};

export function buildMetadata({
  lang,
  title,
  description,
  paths,
  type = "website",
  publishedTime,
}: BuildMetadataInput): Metadata {
  const other = lang === "vi" ? "en" : "vi";
  const openGraph = {
    title,
    description,
    url: paths[lang],
    siteName: SITE_NAME,
    locale: OG_LOCALE[lang],
    alternateLocale: [OG_LOCALE[other]],
  };

  return {
    title,
    description,
    alternates: {
      canonical: paths[lang],
      languages: { vi: paths.vi, en: paths.en, "x-default": paths.vi },
    },
    openGraph:
      type === "article" && publishedTime
        ? { ...openGraph, type, publishedTime }
        : { ...openGraph, type: "website" },
  };
}
