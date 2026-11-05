"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/brand/LogoMark";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { safeNextPath } from "@/lib/admin/next-path";
import { useAdminSession } from "@/lib/admin/session";
import type { UserResponse } from "@/lib/admin/types";
import { LoginForm } from "./LoginForm";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAdminSession();

  async function handleSuccess(user: UserResponse) {
    // The gate of the next screen reads the session, so load it before leaving.
    await refresh();
    if (user.mustChangePassword) router.replace(ADMIN_ROUTES.changePassword);
    else if (user.mustSetupTotp) router.replace(ADMIN_ROUTES.setupTotp);
    else router.replace(safeNextPath(searchParams.get("next")));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      {/* The family's mark first: the screen says whose admin this is before it asks for anything. */}
      <div className="flex items-center gap-3">
        <LogoMark className="size-16 shrink-0" />
        <span className="font-display text-3xl text-earth">Nếp Nhà</span>
      </div>
      <h1 className="text-2xl font-bold">Đăng nhập quản trị</h1>
      <LoginForm onSuccess={handleSuccess} />
    </main>
  );
}
