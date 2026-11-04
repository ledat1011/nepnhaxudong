import type { ReactNode } from "react";
import { AppShell } from "@/components/admin/shell/AppShell";

/** Every screen in this group is private: the shell redirects to the login page without a session. */
export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
