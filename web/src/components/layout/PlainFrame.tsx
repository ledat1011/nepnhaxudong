import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG } from "@/lib/i18n/langs";
import { LogoLink } from "./LogoLink";

// "/" sends the visitor to /vi or /en by the browser language: these pages do not know it.
const LANGUAGE_NEUTRAL_HOME = "/";

/**
 * Light header and footer for the pages that have no home data: the 404 and the error page.
 * They give those documents the same landmarks as the other pages.
 */
export function PlainFrame({
  children,
  year = new Date().getFullYear(),
}: {
  children: ReactNode;
  year?: number;
}) {
  const siteName = getDictionary(DEFAULT_LANG).site.name;
  return (
    <>
      <header className="border-b border-straw bg-rice">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-1">
          <LogoLink href={LANGUAGE_NEUTRAL_HOME} name={siteName} />
        </div>
      </header>
      {children}
      <footer className="bg-earth text-rice">
        <p className="px-4 py-4 text-center text-sm">{`© ${year} ${siteName}`}</p>
      </footer>
    </>
  );
}
