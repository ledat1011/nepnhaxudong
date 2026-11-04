"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { AdminHeader } from "./AdminHeader";
import { SessionErrorScreen } from "./SessionErrorScreen";
import { BottomNav } from "./BottomNav";
import { screenTitle } from "./nav-items";

/** The gate of every private admin screen. It renders nothing private until the session is known. */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, signedOutOnPurpose, refresh } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") {
      // After a deliberate sign-out the user starts fresh; otherwise the login page returns to this screen.
      router.replace(
        signedOutOnPurpose ? ADMIN_ROUTES.login : `${ADMIN_ROUTES.login}?next=${encodeURIComponent(pathname)}`,
      );
    } else if (status === "must-change-password") {
      router.replace(ADMIN_ROUTES.changePassword);
    }
  }, [status, pathname, router, signedOutOnPurpose]);

  if (status === "error") return <SessionErrorScreen onRetry={refresh} />;

  if (status !== "ready" || user === null) {
    return (
      <p role="status" className="p-4 text-muted-foreground">
        Đang tải…
      </p>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <AdminHeader title={screenTitle(pathname)} userName={user.displayName} />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
