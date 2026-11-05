"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TwoFactorCard } from "@/components/admin/accounts/TwoFactorCard";
import { Button } from "@/components/admin/ui/button";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { SessionErrorScreen } from "./SessionErrorScreen";

/**
 * The forced two-factor setup. An owner switched off this user's two-factor login (a lost or new phone), and
 * the API keeps the rest of the admin area closed until it is on again. Any other session state leaves here.
 */
export function SetupTotpScreen() {
  const router = useRouter();
  const { status, refresh, signOut } = useAdminSession();

  useEffect(() => {
    if (status === "signed-out") router.replace(ADMIN_ROUTES.login);
    else if (status === "must-change-password") router.replace(ADMIN_ROUTES.changePassword);
    else if (status === "ready") router.replace(ADMIN_ROUTES.home);
  }, [status, router]);

  if (status === "error") return <SessionErrorScreen onRetry={refresh} />;

  if (status !== "must-setup-totp") {
    return (
      <p role="status" className="p-4 text-muted-foreground">
        Đang tải…
      </p>
    );
  }

  async function done() {
    // The gate of the dashboard reads the session, so load it before leaving.
    await refresh();
    router.replace(ADMIN_ROUTES.home);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Bật lại xác thực 2 lớp</h1>
      <p className="text-muted-foreground">
        Chủ đã tắt xác thực 2 lớp của bạn, thường vì bạn đổi hoặc mất điện thoại. Hãy bật lại bằng ứng dụng xác
        thực trên điện thoại đang dùng, rồi tiếp tục làm việc.
      </p>
      <TwoFactorCard enabled={false} passwordLink={false} onChanged={() => void done()} />
      <Button type="button" variant="outline" onClick={() => void signOut()}>
        Đăng xuất
      </Button>
    </main>
  );
}
