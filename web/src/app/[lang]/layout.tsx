import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/langs";
import { getSiteUrl } from "@/lib/seo/metadata";
import { fontClassName } from "../fonts";
import "../globals.css";

type LangLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

// A function, not a constant: SITE_URL is read per request, not frozen at build time.
export function generateMetadata(): Metadata {
  return { metadataBase: getSiteUrl() };
}

/** Root layout. Each page renders its own header and footer, because only it has the home data. */
export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang: requested } = await params;
  const lang = isLang(requested) ? requested : DEFAULT_LANG;
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={fontClassName}>
      <body>
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
