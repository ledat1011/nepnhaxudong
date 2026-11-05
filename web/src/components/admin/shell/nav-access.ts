import { ShieldCheck } from "lucide-react";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type { UserRole } from "@/lib/admin/types";
import { MORE_ITEMS, isActivePath, screenTitle, type NavItem } from "./nav-items";

/**
 * A member ("Người nhà") cannot manage accounts: on the accounts screen they see only their own two-factor
 * card and the password link. So the menu and the header name that screen for what it holds for them.
 * The API refuses them the account management itself (403).
 */
export const MEMBER_ACCOUNTS_ITEM = { label: "Bảo mật", icon: ShieldCheck } as const;

function isMember(role: UserRole | undefined): boolean {
  return role === "MEMBER";
}

/** The items of the "Thêm" sheet for this role. An unknown role leaves them as they are. */
export function moreItemsFor(role: UserRole | undefined): NavItem[] {
  if (!isMember(role)) return MORE_ITEMS;
  return MORE_ITEMS.map((item) => (item.href === ADMIN_ROUTES.accounts ? { ...item, ...MEMBER_ACCOUNTS_ITEM } : item));
}

/** The header title for this role. */
export function screenTitleFor(pathname: string, role: UserRole | undefined): string {
  if (isMember(role) && isActivePath(pathname, ADMIN_ROUTES.accounts)) return MEMBER_ACCOUNTS_ITEM.label;
  return screenTitle(pathname);
}
