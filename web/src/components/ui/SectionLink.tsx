"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type SectionLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** A page path with a section hash, for example `/vi#tu-hat-lua`. */
  href: string;
};

/**
 * A link to a section of a page. When the address already ends in that hash, the router treats
 * the click as no navigation and does not scroll, so a reader who scrolled away and clicks again
 * stays where they are. This link scrolls to the section itself in that one case; every other
 * click (another hash, another page, a modifier key) goes to the router or the browser as usual.
 */
export function SectionLink({ href, onClick, ...rest }: SectionLinkProps) {
  function scrollWhenSameHash(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = new URL(href, window.location.href);
    const here = window.location;
    if (target.pathname !== here.pathname || target.hash === "" || target.hash !== here.hash) return;
    const section = document.getElementById(decodeURIComponent(target.hash.slice(1)));
    if (!section) return;
    event.preventDefault();
    // The html element sets smooth scrolling unless the reader asks for reduced motion.
    section.scrollIntoView();
  }

  return <Link href={href} onClick={scrollWhenSameHash} {...rest} />;
}
