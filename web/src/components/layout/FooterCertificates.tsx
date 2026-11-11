"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type CertificateKey = "ocop" | "foodSafety";

/**
 * The two current certificates, the same photos as the 2024 journey milestone. They live in the
 * code, not in the admin: when a certificate is renewed, replace the photo here and its texts in the dictionaries.
 */
export const CERTIFICATES: ReadonlyArray<{
  src: string;
  width: number;
  height: number;
  key: CertificateKey;
}> = [
  { src: "/journey/2024-chung-nhan-ocop.webp", width: 679, height: 940, key: "ocop" },
  {
    src: "/journey/2024-chung-nhan-attp.webp",
    width: 716,
    height: 997,
    key: "foodSafety",
  },
];

/** Small photos of the real certificates in the footer; a click shows them large. */
export function FooterCertificates({ dict }: { dict: Dictionary }) {
  const [index, setIndex] = useState<number | null>(null);
  const images: LightboxImage[] = CERTIFICATES.map(({ src, width, height, key }) => ({
    src,
    width,
    height,
    alt: dict.footer[`${key}Alt`],
  }));

  return (
    <>
      <ul aria-label={dict.footer.certificates} className="flex gap-4">
        {CERTIFICATES.map((certificate, i) => (
          <li key={certificate.src} className="w-36 min-[375px]:w-40">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={(event) => {
                // Safari does not focus a button on click; the lightbox gives focus back to it.
                event.currentTarget.focus();
                setIndex(i);
              }}
              className="block w-24 rounded-sm bg-rice p-1 shadow-[0_8px_18px_-8px_rgb(0_0_0/0.6)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rice motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Image
                src={certificate.src}
                alt={images[i].alt}
                width={certificate.width}
                height={certificate.height}
                sizes="96px"
                // Both papers are close to 5:7, so one frame keeps their captions on one line.
                className="aspect-[5/7] w-full object-cover object-top"
              />
            </button>
            <p className="mt-2 font-bold leading-snug">{dict.footer[`${certificate.key}Title`]}</p>
            <p className="text-sm leading-snug">{dict.footer[`${certificate.key}Detail`]}</p>
          </li>
        ))}
      </ul>
      <Lightbox
        images={images}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
        dict={dict}
      />
    </>
  );
}
