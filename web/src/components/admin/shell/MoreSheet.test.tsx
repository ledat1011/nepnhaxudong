import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: { role: "MEMBER" as "OWNER" | "MEMBER" } }));

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ signOut: vi.fn(), user: { id: 1, role: session.role } }),
}));
vi.mock("@/lib/admin/use-unsaved-changes", () => ({ useConfirmLeave: () => (go: () => void) => go() }));

import { MoreSheet } from "./MoreSheet";

describe("MoreSheet by role", () => {
  it("shows a member Bảo mật instead of Tài khoản", () => {
    session.role = "MEMBER";
    render(<MoreSheet open onOpenChange={vi.fn()} />);
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).queryByRole("link", { name: "Tài khoản" })).not.toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Bảo mật" })).toHaveAttribute("href", "/admin/tai-khoan");
  });

  it("shows an owner Tài khoản", () => {
    session.role = "OWNER";
    render(<MoreSheet open onOpenChange={vi.fn()} />);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Tài khoản" })).toBeInTheDocument();
  });
});
