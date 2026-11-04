import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Contact } from "@/lib/content/types";
import { telHref, zaloHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type ContactSectionProps = {
  dict: Dictionary;
  contact: Contact;
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-coat px-6 py-2 font-bold text-rice underline-offset-4 hover:underline hover:bg-earth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

/** Contact by phone, Zalo and Messenger only: no form, no embedded map. */
export function ContactSection({ dict, contact }: ContactSectionProps) {
  const { phone, zalo, messenger, address, mapUrl, hours } = contact;
  const hasButtons = phone !== null || zalo !== null || messenger !== null;
  const hasDetails = address !== null || hours !== null;

  return (
    <section aria-labelledby="lien-he">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <SectionHeading id="lien-he" title={dict.sections.contact} />
        <div data-reveal className="grid gap-8 md:grid-cols-2 md:items-start">
          {hasButtons && (
            <ul className="flex flex-wrap gap-3">
              {phone !== null && (
                <li>
                  <a href={telHref(phone)} className={BUTTON_CLASS}>
                    {phone}
                  </a>
                </li>
              )}
              {zalo !== null && (
                <li>
                  <a href={zaloHref(zalo)} className={BUTTON_CLASS}>
                    {dict.contact.zalo}
                  </a>
                </li>
              )}
              {messenger !== null && (
                <li>
                  <a
                    href={messenger}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BUTTON_CLASS}
                  >
                    {dict.contact.messenger}
                  </a>
                </li>
              )}
            </ul>
          )}
          {hasDetails && (
            <dl className="space-y-5 rounded-2xl bg-straw p-6">
              {address !== null && (
                <div>
                  <dt className="font-bold text-coat">
                    {dict.contact.address}
                  </dt>
                  <dd className="mt-1 text-lg font-medium">{address}</dd>
                  {mapUrl !== null && (
                    <dd className="mt-1">
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center rounded font-bold underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
                      >
                        {dict.contact.viewMap}
                      </a>
                    </dd>
                  )}
                </div>
              )}
              {hours !== null && (
                <div>
                  <dt className="font-bold text-coat">
                    {dict.contact.hours}
                  </dt>
                  <dd className="mt-1 text-lg font-medium">{hours}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
