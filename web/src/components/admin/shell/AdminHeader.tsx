import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ScreenDetail } from "./screen-detail";

type Props = {
  title: string;
  userName: string;
  /** The list screen of a detail page. When set, the header shows "Quay lại" and the item instead of the user. */
  back?: { href: string; label: string } | null;
  detail?: ScreenDetail | null;
};

const HEADER_LINK =
  "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-base font-semibold text-primary outline-none hover:bg-muted active:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AdminHeader({ title, userName, back, detail }: Props) {
  if (back) return <DetailHeader back={back} detail={detail ?? null} />;
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b bg-card px-4">
      {/* The screen name is the one level-1 heading of every private admin page; sections below use h2. */}
      <h1 className="truncate text-lg font-bold">{title}</h1>
      <p className="max-w-[50%] truncate text-sm text-muted-foreground">{userName}</p>
    </header>
  );
}

/**
 * The header of a product or a story: the way back, the name of the item in full, and its public page.
 * It is not sticky: it scrolls away, so the form gets the height of the screen. The bottom menu and the Lưu bar
 * stay, and the way back is at the top of the page.
 */
function DetailHeader({ back, detail }: { back: { href: string; label: string }; detail: ScreenDetail | null }) {
  return (
    <header className="border-b bg-card">
      <div className="flex min-h-12 items-center justify-between gap-2 px-2 pt-1">
        {/* The spoken name starts with the visible words, so voice control ("Quay lại") still finds it. */}
        <Link href={back.href} aria-label={`Quay lại danh sách ${back.label.toLowerCase()}`} className={HEADER_LINK}>
          <ChevronLeft aria-hidden className="size-5" />
          Quay lại
        </Link>
        {detail?.publicHref ? (
          // A new tab: the form stays open with what the user typed.
          <a
            href={detail.publicHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Xem trên web (mở thẻ mới)"
            className={`${HEADER_LINK} underline underline-offset-4`}
          >
            Xem trên web
            <ExternalLink aria-hidden className="size-4" />
          </a>
        ) : null}
      </div>
      <div className="px-4 pb-3">
        {detail ? <p className="text-sm text-muted-foreground">{back.label}</p> : null}
        {/* Long names wrap: the user must see which item is open. */}
        <h1 className="text-xl leading-snug font-bold [overflow-wrap:anywhere]">{detail?.name ?? back.label}</h1>
      </div>
    </header>
  );
}
