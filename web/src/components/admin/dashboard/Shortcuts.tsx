import { BookOpen, Image, Milestone, Newspaper, Package, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";

const SHORTCUTS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Viết câu chuyện", href: `${ADMIN_ROUTES.stories}/moi`, icon: BookOpen },
  { label: "Tải ảnh", href: ADMIN_ROUTES.media, icon: Image },
  { label: "Sửa sản phẩm", href: ADMIN_ROUTES.products, icon: Package },
  { label: "Thêm mốc hành trình", href: ADMIN_ROUTES.timeline, icon: Milestone },
  { label: "Thêm bài báo", href: ADMIN_ROUTES.press, icon: Newspaper },
  { label: "Liên hệ & cài đặt", href: ADMIN_ROUTES.settings, icon: Settings },
];

/** Six big tiles for the jobs the family does most. */
export function Shortcuts() {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {SHORTCUTS.map(({ label, href, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border bg-card p-3 text-center font-semibold hover:bg-muted active:bg-secondary"
          >
            <Icon aria-hidden="true" className="size-6" />
            <span className="min-w-0 break-words">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
