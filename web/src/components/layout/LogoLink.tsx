import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";

type LogoLinkProps = {
  href: string;
  name: string;
};

/**
 * Logo and site name, linking home. At least 44 px high and wide for a finger. On hover the
 * name is underlined, so the hover state is not a color change alone.
 */
export function LogoLink({ href, name }: LogoLinkProps) {
  return (
    <Link
      href={href}
      className="group mr-auto inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
    >
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-xl text-earth underline-offset-4 group-hover:underline max-[419px]:sr-only md:text-2xl">
        {name}
      </span>
    </Link>
  );
}
