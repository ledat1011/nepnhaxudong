"use client";

import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FIELD_PARAM } from "@/lib/admin/field-targets";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type { ScreenDetail } from "./screen-detail";

/** The header's row lines up with the 960 px page column below it (AppShell's CONTENT_WIDTH). */
const ROW_WIDTH = "mx-auto w-full max-w-[60rem]";

type Back = { href: string; label: string };

type Props = {
  title: string;
  userName: string;
  /** The list screen of a detail page. When set, the header shows "Quay lại" and the item instead of the user. */
  back?: Back | null;
  detail?: ScreenDetail | null;
};

const HEADER_LINK =
  "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-base font-semibold text-primary outline-none hover:bg-muted active:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AdminHeader({ title, userName, back, detail }: Props) {
  if (back) return <DetailHeader back={back} detail={detail ?? null} />;
  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className={`${ROW_WIDTH} flex min-h-14 items-center justify-between gap-3 px-4`}>
        {/* The screen name is the one level-1 heading of every private admin page; sections below use h2. */}
        <h1 className="truncate text-lg font-bold">{title}</h1>
        <p className="max-w-[50%] truncate text-sm text-muted-foreground">{userName}</p>
      </div>
    </header>
  );
}

/** A page opened from a to-do row of Tổng quan (`?o=`) goes back there, not to the list. */
function BackLinkForSearch({ list }: { list: Back }) {
  const fromTodo = useSearchParams().has(FIELD_PARAM);
  return fromTodo ? <BackLink to={{ href: ADMIN_ROUTES.home, label: "Tổng quan" }} home /> : <BackLink to={list} home={false} />;
}

function BackLink({ to, home }: { to: Back; home: boolean }) {
  // The spoken name starts with the visible words, so voice control ("Quay lại") still finds it, and says where it goes.
  const name = home ? `Quay lại ${to.label}` : `Quay lại danh sách ${to.label.toLowerCase()}`;
  return (
    <Link href={to.href} aria-label={name} className={HEADER_LINK}>
      <ChevronLeft aria-hidden className="size-5" />
      Quay lại
    </Link>
  );
}

/**
 * The header of a product or a story: the way back, the name of the item in full, and its public page.
 * It is not sticky: it scrolls away, so the form gets the height of the screen. The bottom menu and the Lưu bar
 * stay, and the way back is at the top of the page.
 */
function DetailHeader({ back, detail }: { back: Back; detail: ScreenDetail | null }) {
  return (
    <header className="border-b bg-card">
      <div className={`${ROW_WIDTH} flex min-h-12 items-center justify-between gap-2 px-2 pt-1`}>
        {/* The search params are known only in the browser; until then the link goes to the list. */}
        <Suspense fallback={<BackLink to={back} home={false} />}>
          <BackLinkForSearch list={back} />
        </Suspense>
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
      <div className={`${ROW_WIDTH} px-4 pb-3`}>
        {detail ? <p className="text-sm text-muted-foreground">{back.label}</p> : null}
        {/* Long names wrap: the user must see which item is open. */}
        <h1 className="text-xl leading-snug font-bold text-pretty [overflow-wrap:anywhere]">{detail?.name ?? back.label}</h1>
      </div>
    </header>
  );
}
