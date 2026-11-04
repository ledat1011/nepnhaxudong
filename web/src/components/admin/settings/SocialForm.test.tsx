import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { SocialSettings } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { SocialForm } from "./SocialForm";

const saved: SocialSettings = {
  facebook: "https://www.facebook.com/nepnha",
  youtube: null,
  tiktok: "https://www.tiktok.com/@nepnha",
};

function puts(): { path: string; body: SocialSettings }[] {
  return adminFetch.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([path, init]) => ({ path: path as string, body: init.body }));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockImplementation(async (_path: string, init?: { method?: string; body?: SocialSettings }) =>
    init?.method === "PUT" ? init.body : saved,
  );
});

describe("SocialForm", () => {
  it("loads the saved addresses", async () => {
    render(<SocialForm />);
    expect(await screen.findByLabelText("Facebook")).toHaveValue("https://www.facebook.com/nepnha");
    expect(screen.getByLabelText("YouTube")).toHaveValue("");
    expect(screen.getByLabelText("TikTok")).toHaveValue("https://www.tiktok.com/@nepnha");
    expect(adminFetch).toHaveBeenCalledWith("/admin/settings/social");
  });

  it("sends empty boxes as null and trims the others, with its own PUT", async () => {
    const user = userEvent.setup();
    render(<SocialForm />);
    await user.clear(await screen.findByLabelText("Facebook"));
    await user.type(screen.getByLabelText("YouTube"), "  https://youtube.com/@nepnha ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]).toEqual({
      path: "/admin/settings/social",
      body: { facebook: null, youtube: "https://youtube.com/@nepnha", tiktok: "https://www.tiktok.com/@nepnha" },
    });
  });

  it("shows the API text for an address that is not a web address", async () => {
    const user = userEvent.setup();
    render(<SocialForm />);
    await user.type(await screen.findByLabelText("YouTube"), "youtube");
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "PUT") throw new AdminApiError(400, "Đường dẫn YouTube phải bắt đầu bằng http:// hoặc https://.");
      return saved;
    });
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    const youtube = screen.getByLabelText("YouTube");
    await waitFor(() => expect(youtube).toHaveFocus());
    expect(youtube).toHaveAccessibleDescription(/^Đường dẫn YouTube phải bắt đầu/);
    expect(youtube).toHaveValue("youtube");
  });
});
