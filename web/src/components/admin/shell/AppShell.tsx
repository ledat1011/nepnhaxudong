"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { NavGuardProvider } from "@/lib/admin/nav-guard";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { AdminHeader } from "./AdminHeader";
import { SessionErrorScreen } from "./SessionErrorScreen";
import { BottomNav } from "./BottomNav";
import { FieldFocus } from "./FieldFocus";
import { screenTitleFor } from "./nav-access";
import { parentScreen } from "./nav-items";
import { ScreenDetailContext, type ScreenDetail } from "./screen-detail";

/** The gate of every private admin screen. It renders nothing private until the session is known. */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, signedOutOnPurpose, refresh } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();
  const [detail, setDetail] = useState<ScreenDetail | null>(null);

  useEffect(() => {
    if (status === "signed-out") {
      // After a deliberate sign-out the user starts fresh; otherwise the login page returns to this screen.
      router.replace(
        signedOutOnPurpose ? ADMIN_ROUTES.login : `${ADMIN_ROUTES.login}?next=${encodeURIComponent(pathname)}`,
      );
    } else if (status === "must-change-password") {
      router.replace(ADMIN_ROUTES.changePassword);
    } else if (status === "must-setup-totp") {
      router.replace(ADMIN_ROUTES.setupTotp);
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
    <NavGuardProvider>
      <ScreenDetailContext.Provider value={setDetail}>
        <div className="min-h-dvh pb-24">
          <AdminHeader
            title={screenTitleFor(pathname, user.role)}
            userName={user.displayName}
            back={parentScreen(pathname)}
            detail={detail}
          />
          <main>{children}</main>
          <BottomNav />
        </div>
      </ScreenDetailContext.Provider>
      {/* Opens a screen at one field when a link says which (?o=…). It reads the search params, hence Suspense. */}
      <Suspense fallback={null}>
        <FieldFocus />
      </Suspense>
    </NavGuardProvider>
  );
}
