import Link from "next/link";
import { ZaloLink } from "@/components/contact/ZaloLink";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";
import { LanguageSwitch } from "./LanguageSwitch";
import { LogoLink } from "./LogoLink";
import { MobileMenu } from "./MobileMenu";

type SiteHeaderProps = {
  lang: Lang;
  dict: Dictionary;
  nav: Array<{ id: string; label: string }>;
  zalo: string | null;
  alternateHref: string;
};

const LINK_CLASS =
  "flex min-h-11 items-center whitespace-nowrap rounded px-2 font-medium text-earth md:text-sm lg:text-base hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

export function SiteHeader({ lang, dict, nav, zalo, alternateHref }: SiteHeaderProps) {
  const home = homePath(lang);
  const items = nav.map((item) => (
    <li key={item.id}>
      <Link href={`${home}#${item.id}`} className={LINK_CLASS}>
        {item.label}
      </Link>
    </li>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-straw bg-rice">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1 md:gap-3">
        <LogoLink href={home} name={dict.site.name} />
        <nav aria-label={dict.nav.label} className="hidden md:block">
          <ul className="flex items-center gap-2">{items}</ul>
        </nav>
        <LanguageSwitch
          lang={lang}
          alternateHref={alternateHref}
          labels={dict.language}
          loadingLabel={dict.loading.page}
        />
        {zalo !== null && (
          <ZaloLink
            zalo={zalo}
            labels={dict.zalo}
            className="inline-flex min-h-11 items-center rounded-full bg-coat px-3 text-sm font-bold text-rice underline-offset-4 hover:bg-earth hover:underline md:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
          >
            {dict.contact.zalo}
          </ZaloLink>
        )}
        <MobileMenu label={dict.nav.openMenu} closeLabel={dict.nav.closeMenu}>
          <nav aria-label={dict.nav.label}>
            <ul className="flex flex-col gap-1">{items}</ul>
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}
