import type { Metadata } from "next";
import { SetupTotpScreen } from "@/components/admin/shell/SetupTotpScreen";

export const metadata: Metadata = { title: "Bật lại xác thực 2 lớp" };

export default function SetupTotpPage() {
  return <SetupTotpScreen />;
}
