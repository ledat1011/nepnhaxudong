import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { storiesPath } from "@/lib/i18n/routes";

type PaginationProps = {
  lang: Lang;
  /** 0-based page number. */
  page: number;
  hasNext: boolean;
  dict: Dictionary;
};

const LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-coat px-6 py-2 font-bold text-coat underline-offset-4 hover:underline hover:bg-coat hover:text-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

export function Pagination({ lang, page, hasNext, dict }: PaginationProps) {
  const hasPrevious = page > 0;
  if (!hasPrevious && !hasNext) return null;

  return (
    <nav aria-label={dict.stories.pagination} className="mt-10 flex flex-wrap justify-center gap-4">
      {hasPrevious && (
        <Link href={storiesPath(lang, page - 1)} rel="prev" className={LINK_CLASS}>
          {dict.stories.previousPage}
        </Link>
      )}
      {hasNext && (
        <Link href={storiesPath(lang, page + 1)} rel="next" className={LINK_CLASS}>
          {dict.stories.nextPage}
        </Link>
      )}
    </nav>
  );
}
