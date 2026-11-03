"use client";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { homePath } from "@/lib/i18n/routes";
import { LANGS } from "@/lib/i18n/langs";

// The error boundary cannot know the language for sure, so both are shown.
// The error itself is never shown: its message may contain internal details.
export default function LangError({ retry }: { retry: () => void }) {
  return (
    <main id="noi-dung" className="mx-auto max-w-xl px-4 py-24 text-center">
      {LANGS.map((lang) => {
        const { error } = getDictionary(lang);
        return (
          <section key={lang} lang={lang} className="mb-8">
            <h1 className="mb-2 font-display text-3xl">{error.title}</h1>
            <p>{error.message}</p>
          </section>
        );
      })}
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-coat px-6 py-2 font-bold text-rice hover:bg-earth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
      >
        {LANGS.map((lang) => getDictionary(lang).error.retry).join(" / ")}
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
