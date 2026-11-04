import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";

type LanguageSwitchProps = {
  lang: Lang;
  alternateHref: string;
  labels: Dictionary["language"];
};

const OTHER_LANG: Record<Lang, Lang> = { vi: "en", en: "vi" };

/** Link to the same page in the other language. */
export function LanguageSwitch({ lang, alternateHref, labels }: LanguageSwitchProps) {
  const target = OTHER_LANG[lang];
  return (
    <Link
      href={alternateHref}
      hrefLang={target}
      lang={target}
      className="inline-flex min-h-11 items-center rounded-full border border-coat px-3 text-sm font-medium text-earth underline-offset-4 hover:bg-straw hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
    >
      {labels[target]}
    </Link>
  );
}
