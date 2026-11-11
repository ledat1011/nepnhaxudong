"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type SectionLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** A page path with a section hash, for example `/vi#tu-hat-lua`. */
  href: string;
};

/**
 * A link to a section of a page. When the section is on the page the reader is on, this link
 * scrolls to it itself and puts the link's address in the history. The router does not scroll in
 * two such cases: the address already ends in that hash (it sees no navigation), and the address
 * has a query string, for example `?utm_source=zalo` from a shared link (it sees a new page and
 * keeps the scroll position). A click to another page, or with a modifier key, goes to the router
 * or the browser as usual.
 */
export function SectionLink({ href, onClick, ...rest }: SectionLinkProps) {
  function scrollOnSamePage(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = new URL(href, window.location.href);
    const here = window.location;
    if (target.pathname !== here.pathname || target.hash === "") return;
    const section = document.getElementById(decodeURIComponent(target.hash.slice(1)));
    if (!section) return;
    event.preventDefault();
    const address = target.pathname + target.search + target.hash;
    // The app router follows `history.pushState`, so the router state stays in step with the address.
    if (address !== here.pathname + here.search + here.hash) window.history.pushState(null, "", address);
    // The html element sets smooth scrolling unless the reader asks for reduced motion.
    section.scrollIntoView();
  }

  return <Link href={href} onClick={scrollOnSamePage} {...rest} />;
}
