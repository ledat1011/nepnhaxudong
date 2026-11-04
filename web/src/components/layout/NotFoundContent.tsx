import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LANGS } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";
import { withSiteName } from "@/lib/seo/metadata";
import { PlainFrame } from "./PlainFrame";

/** Page title: both languages, like the body. */
export const NOT_FOUND_TITLE = withSiteName(
  LANGS.map((lang) => getDictionary(lang).notFound.title).join(" | "),
);

/**
 * Body of the 404 page. The language of the URL is not known here, so both languages
 * are shown, each in an element with its own lang. Only the first has the h1.
 * The plain header and footer give the document its landmarks.
 */
export function NotFoundContent() {
  return (
    <PlainFrame>
      <main id="noi-dung" className="mx-auto max-w-xl px-4 py-24 text-center">
        {LANGS.map((lang, index) => {
          const { notFound } = getDictionary(lang);
          const Heading = index === 0 ? "h1" : "h2";
          return (
            <section key={lang} lang={lang} className="mb-8">
              <Heading className="mb-2 font-display text-3xl">{notFound.title}</Heading>
              <p className="mb-3">{notFound.message}</p>
              <Link
                href={homePath(lang)}
                className="inline-flex min-h-11 items-center underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
              >
                {notFound.home}
              </Link>
            </section>
          );
        })}
      </main>
    </PlainFrame>
  );
}
