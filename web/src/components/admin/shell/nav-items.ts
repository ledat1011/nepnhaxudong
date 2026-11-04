import {
  BookOpen,
  History,
  Image,
  LayoutDashboard,
  Milestone,
  Newspaper,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_ROUTES } from "@/lib/admin/routes";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/** The four links of the bottom bar. The fifth item, "Thêm", opens MORE_ITEMS. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: ADMIN_ROUTES.home, icon: LayoutDashboard },
  { label: "Câu chuyện", href: ADMIN_ROUTES.stories, icon: BookOpen },
  { label: "Ảnh", href: ADMIN_ROUTES.media, icon: Image },
  { label: "Lịch sử", href: ADMIN_ROUTES.history, icon: History },
];

export const MORE_ITEMS: NavItem[] = [
  { label: "Sản phẩm", href: ADMIN_ROUTES.products, icon: Package },
  { label: "Hành trình", href: ADMIN_ROUTES.timeline, icon: Milestone },
  { label: "Báo chí", href: ADMIN_ROUTES.press, icon: Newspaper },
  { label: "Liên hệ & cài đặt", href: ADMIN_ROUTES.settings, icon: Settings },
  { label: "Tài khoản", href: ADMIN_ROUTES.accounts, icon: Users },
];

/** The dashboard link matches only its own path; every other link also matches its sub-pages. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === ADMIN_ROUTES.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMoreActive(pathname: string): boolean {
  return MORE_ITEMS.some((item) => isActivePath(pathname, item.href));
}

/** The name of the screen shown in the header. */
export function screenTitle(pathname: string): string {
  const item = [...NAV_ITEMS, ...MORE_ITEMS].find((candidate) => isActivePath(pathname, candidate.href));
  return item?.label ?? "Quản trị";
}
