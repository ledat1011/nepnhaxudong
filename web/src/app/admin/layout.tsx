import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSessionProvider } from "@/lib/admin/session";
import { Toaster } from "@/components/admin/ui/sonner";
import { fontClassName } from "../fonts";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Quản trị Nếp Nhà", template: "%s · Quản trị Nếp Nhà" },
  robots: { index: false, follow: false },
};

/**
 * Root layout of the admin area. It is a second root layout next to the one under `[lang]`:
 * the admin is Vietnamese only and has its own styles (admin.css), so it needs no language segment.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={fontClassName}>
      <body>
        <AdminSessionProvider>{children}</AdminSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
