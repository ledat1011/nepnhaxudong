import type { Metadata } from "next";
import { NOT_FOUND_TITLE, NotFoundContent } from "@/components/layout/NotFoundContent";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG } from "@/lib/i18n/langs";
import { fontClassName } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: NOT_FOUND_TITLE,
  description: getDictionary(DEFAULT_LANG).notFound.message,
};

/**
 * The 404 page of the whole app. The root layout sits under the `[lang]` segment, so
 * Next cannot compose a 404 from it for an unknown path: this file is a full document.
 */
export default function GlobalNotFound() {
  return (
    <html lang={DEFAULT_LANG} className={fontClassName}>
      <body>
        <NotFoundContent />
      </body>
    </html>
  );
}
