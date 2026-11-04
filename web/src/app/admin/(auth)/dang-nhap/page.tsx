import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/admin/shell/LoginScreen";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  // LoginScreen reads the `next` query parameter, which needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
