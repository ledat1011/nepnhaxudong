import type { ReactNode } from "react";

type ExternalLinkProps = {
  href: string;
  /** "(opens in a new tab)" in the page language, read only by screen readers. */
  newTabLabel: string;
  className?: string;
  children: ReactNode;
};

/** A link to another site, opened in a new tab without access to this page (`noopener`). */
export function ExternalLink({ href, newTabLabel, className, children }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}{" "}
      <span className="sr-only">{newTabLabel}</span>
    </a>
  );
}
