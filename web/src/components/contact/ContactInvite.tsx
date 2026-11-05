import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Contact } from "@/lib/content/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { ZaloLink } from "./ZaloLink";

type ContactInviteProps = {
  lang: Lang;
  dict: Dictionary;
  contact: Contact;
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full px-6 py-2 font-bold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

/**
 * The end of a story page: a reader who has just finished a story is ready to ask, so the way to
 * message the family is right there. Messenger shows on the English page only, like in the hero.
 */
export function ContactInvite({ lang, dict, contact }: ContactInviteProps) {
  const messenger = lang === "en" ? contact.messenger : null;
  if (contact.zalo === null && messenger === null) return null;

  return (
    <aside aria-labelledby="moi-dat-gao" className="mt-12 rounded-2xl bg-straw p-6">
      <h2 id="moi-dat-gao" className="text-xl font-bold text-balance md:text-2xl">
        {dict.invite.title}
      </h2>
      <p className="mt-2 leading-relaxed">{dict.invite.text}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {contact.zalo !== null && (
          <ZaloLink
            zalo={contact.zalo}
            labels={dict.zalo}
            className={`${BUTTON_CLASS} bg-coat text-rice hover:bg-earth`}
          >
            {dict.invite.zalo}
          </ZaloLink>
        )}
        {messenger !== null && (
          <ExternalLink
            href={messenger}
            newTabLabel={dict.link.newTab}
            className={`${BUTTON_CLASS} border-2 border-coat text-earth hover:bg-rice`}
          >
            {dict.invite.messenger}
          </ExternalLink>
        )}
      </div>
    </aside>
  );
}
