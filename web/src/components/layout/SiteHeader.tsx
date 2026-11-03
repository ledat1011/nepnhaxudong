import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";
import { zaloHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";
import { LanguageSwitch } from "./LanguageSwitch";
import { MobileMenu } from "./MobileMenu";

type SiteHeaderProps = {
  lang: Lang;
  dict: Dictionary;
  nav: Array<{ id: string; label: string }>;
  zalo: string | null;
  alternateHref: string;
};

const LINK_CLASS =
  "rounded px-2 py-1 font-medium text-earth hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

export function SiteHeader({ lang, dict, nav, zalo, alternateHref }: SiteHeaderProps) {
  const home = homePath(lang);
  const items = nav.map((item) => (
    <li key={item.id}>
      <Link href={`${home}#${item.id}`} className={`block ${LINK_CLASS}`}>
        {item.label}
      </Link>
    </li>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-straw bg-rice">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 md:gap-3">
        <Link
          href={home}
          className="mr-auto flex shrink-0 items-center gap-2 whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
        >
          <LogoMark className="h-9 w-9" />
          <span className="font-display text-xl text-earth md:text-2xl">{dict.site.name}</span>
        </Link>
        <nav aria-label={dict.nav.label} className="order-last md:order-none">
          <ul className="hidden items-center gap-2 md:flex">{items}</ul>
          <MobileMenu label={dict.nav.openMenu} closeLabel={dict.nav.closeMenu}>
            <ul className="flex flex-col gap-1">{items}</ul>
          </MobileMenu>
        </nav>
        <LanguageSwitch lang={lang} alternateHref={alternateHref} labels={dict.language} />
        {zalo !== null && (
          <a
            href={zaloHref(zalo)}
            className="rounded-full bg-coat px-3 py-1.5 md:px-4 text-sm font-bold text-rice hover:bg-earth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
          >
            {dict.contact.zalo}
          </a>
        )}
      </div>
    </header>
  );
}
