import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/langs";
import { getSiteUrl, isIndexingOff } from "@/lib/seo/metadata";
import { fontClassName } from "../fonts";
import "../globals.css";

type LangLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

// A function, not a constant: SITE_URL and SITE_NOINDEX are read per request, not frozen at build time.
// Pages do not set "robots", so this value reaches every public page.
export function generateMetadata(): Metadata {
  const metadataBase = getSiteUrl();
  return isIndexingOff() ? { metadataBase, robots: { index: false, follow: false } } : { metadataBase };
}

/** Root layout. Each page renders its own header and footer, because only it has the home data. */
export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang: requested } = await params;
  const lang = isLang(requested) ? requested : DEFAULT_LANG;
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={fontClassName}>
      <body>
        <NavigationProgress />
        <a
          href="#noi-dung"
          className="sr-only rounded bg-earth px-4 py-2 font-bold text-rice focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center"
        >
          {dict.nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
