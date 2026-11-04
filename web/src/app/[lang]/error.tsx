"use client";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { LANGS } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";
import { withSiteName } from "@/lib/seo/metadata";

const ERROR_TITLE = withSiteName(LANGS.map((lang) => getDictionary(lang).error.title).join(" | "));

// The error boundary cannot know the language for sure, so both are shown,
// each in an element with its own lang attribute.
// The error itself is never shown: its message may contain internal details.
export default function LangError({ retry }: { retry: () => void }) {
  return (
    <main id="noi-dung" className="mx-auto max-w-xl px-4 py-24 text-center">
      <title>{ERROR_TITLE}</title>
      {LANGS.map((lang, index) => {
        const { error } = getDictionary(lang);
        const Heading = index === 0 ? "h1" : "h2";
        return (
          <section key={lang} lang={lang} className="mb-8">
            <Heading className="mb-2 font-display text-3xl">{error.title}</Heading>
            <p>{error.message}</p>
          </section>
        );
      })}
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-coat px-6 py-2 font-bold text-rice hover:bg-earth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
      >
        {LANGS.map((lang, index) => (
          <span key={lang}>
            {index > 0 && (
              <>
                {" "}
                <span aria-hidden="true">/</span>{" "}
              </>
            )}
            <span lang={lang}>{getDictionary(lang).error.retry}</span>
          </span>
        ))}
      </button>
      <p className="mt-6 flex justify-center gap-4">
        {LANGS.map((lang) => (
          <a
            key={lang}
            href={homePath(lang)}
            lang={lang}
            className="underline underline-offset-4 hover:no-underline"
          >
            {getDictionary(lang).error.home}
          </a>
        ))}
      </p>
    </main>
  );
}
