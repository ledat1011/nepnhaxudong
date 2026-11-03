import { LogoMark } from "@/components/brand/LogoMark";
import type { Contact, Social } from "@/lib/content/types";
import { telHref, zaloHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";

type SiteFooterProps = {
  lang: Lang;
  dict: Dictionary;
  contact: Contact;
  social: Social;
};

const LINK_CLASS =
  "rounded underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rice";

// Brand names are the same in both languages.
const SOCIAL_NETWORKS = [
  { key: "facebook", name: "Facebook" },
  { key: "youtube", name: "YouTube" },
  { key: "tiktok", name: "TikTok" },
] as const;

type ContactRow = { label: string | null; value: string; href: string | null };

function contactRows(contact: Contact, dict: Dictionary): ContactRow[] {
  const labels = dict.contact;
  const rows: Array<ContactRow | null> = [
    contact.phone
      ? {
          label: labels.phone,
          value: contact.phone,
          href: telHref(contact.phone),
        }
      : null,
    contact.zalo
      ? {
          label: labels.zalo,
          value: contact.zalo,
          href: zaloHref(contact.zalo),
        }
      : null,
    contact.messenger
      ? {
          label: null,
          value: labels.messenger,
          href: contact.messenger,
        }
      : null,
    contact.address
      ? { label: labels.address, value: contact.address, href: null }
      : null,
    contact.mapUrl
      ? {
          label: null,
          value: labels.viewMap,
          href: contact.mapUrl,
        }
      : null,
    contact.hours
      ? { label: labels.hours, value: contact.hours, href: null }
      : null,
  ];
  return rows.filter((row): row is ContactRow => row !== null);
}

export function SiteFooter({ dict, contact, social }: SiteFooterProps) {
  const rows = contactRows(contact, dict);
  const networks = SOCIAL_NETWORKS.flatMap(({ key, name }) => {
    const url = social[key];
    return url ? [{ key, name, url }] : [];
  });

  return (
    <footer className="bg-earth text-rice">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <LogoMark className="h-12 w-12" />
          <span className="font-display text-3xl">{dict.site.name}</span>
        </div>
        <div className="space-y-6">
          {rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.href ?? row.value}>
                  {row.label && (
                    <span className="font-bold">{row.label}: </span>
                  )}
                  {row.href ? (
                    <a href={row.href} className={LINK_CLASS}>
                      {row.value}
                    </a>
                  ) : (
                    <span>{row.value}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {networks.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {networks.map(({ key, name, url }) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASS}
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="border-t border-coat px-4 py-4 text-center text-sm">
        {`${dict.footer.copyright} © ${new Date().getFullYear()} ${dict.site.name}`}
      </p>
    </footer>
  );
}
