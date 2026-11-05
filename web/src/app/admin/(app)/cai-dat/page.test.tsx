import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import SettingsPage from "./page";

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockImplementation(async (path: string) => {
    if (path === "/admin/settings/contact")
      return { phone: "0901", zalo: null, messenger: null, address: null, mapUrl: null, hours: null };
    if (path === "/admin/settings/social") return { facebook: null, youtube: null, tiktok: null };
    return { tagline: null };
  });
});

describe("Cài đặt page", () => {
  it("has one tab for each of the three settings and loads the contact form first", async () => {
    render(<SettingsPage />);
    expect(screen.getByRole("tab", { name: "Liên hệ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Mạng xã hội" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Thương hiệu" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Điện thoại")).toHaveValue("0901");
  });

  it("keeps an unsaved change when the user looks at another tab and comes back", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.type(await screen.findByLabelText("Điện thoại"), "99");
    await user.click(screen.getByRole("tab", { name: "Mạng xã hội" }));
    expect(await screen.findByLabelText("Facebook")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Liên hệ" }));
    await waitFor(() => expect(screen.getByLabelText("Điện thoại")).toBeVisible());
    expect(screen.getByLabelText("Điện thoại")).toHaveValue("090199");
  });

  it("shows only the Lưu bar of the open tab", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await screen.findByLabelText("Điện thoại");
    expect(screen.getAllByRole("button", { name: "Lưu" })).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: "Thương hiệu" }));
    expect(screen.getAllByRole("button", { name: "Lưu" })).toHaveLength(1);
    expect(await screen.findByRole("group", { name: /Khẩu hiệu/ })).toBeVisible();
  });
});
