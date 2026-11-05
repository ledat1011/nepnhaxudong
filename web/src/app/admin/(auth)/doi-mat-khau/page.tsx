import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/admin/shell/ChangePasswordForm";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
