import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LANGS } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";

// Rendered for any missing page. The language of the URL is not known here, so both are shown.
export default function LangNotFound() {
  return (
    <main id="noi-dung" className="mx-auto max-w-xl px-4 py-24 text-center">
      {LANGS.map((lang) => {
        const { notFound } = getDictionary(lang);
        return (
          <section key={lang} lang={lang} className="mb-8">
            <h1 className="mb-2 font-display text-3xl">{notFound.title}</h1>
            <p className="mb-3">{notFound.message}</p>
            <Link
              href={homePath(lang)}
              className="underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
            >
              {notFound.home}
            </Link>
          </section>
        );
      })}
    </main>
  );
}
