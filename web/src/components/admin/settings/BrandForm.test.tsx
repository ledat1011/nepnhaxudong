import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { BrandSettings } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { BrandForm } from "./BrandForm";

function puts(): { path: string; body: BrandSettings }[] {
  return adminFetch.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([path, init]) => ({ path: path as string, body: init.body }));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockImplementation(async (_path: string, init?: { method?: string; body?: BrandSettings }) =>
    init?.method === "PUT" ? init.body : { tagline: null },
  );
});

describe("BrandForm", () => {
  it("loads an empty tagline and sends blanks as null", async () => {
    const user = userEvent.setup();
    render(<BrandForm />);
    const vi_ = await screen.findByLabelText("Tiếng Việt");
    expect(vi_).toHaveValue("");
    expect(adminFetch).toHaveBeenCalledWith("/admin/settings/brand");
    await user.type(vi_, "  Gạo sạch  ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]).toEqual({ path: "/admin/settings/brand", body: { tagline: { vi: "Gạo sạch", en: null } } });
  });

  it("shows the missing-English badge only when Vietnamese has words and English is blank", async () => {
    const user = userEvent.setup();
    render(<BrandForm />);
    await user.type(await screen.findByLabelText("Tiếng Việt"), "Gạo sạch");
    expect(screen.getByText(/Thiếu EN|thiếu EN/i)).toBeInTheDocument();
  });

  it("shows the API text when only English was typed", async () => {
    const user = userEvent.setup();
    render(<BrandForm />);
    await user.type(await screen.findByLabelText("English"), "Clean rice");
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "PUT")
        throw new AdminApiError(400, "Khẩu hiệu (tiếng Việt) không được để trống khi đã có nội dung tiếng Anh.");
      return { tagline: null };
    });
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText(/^Khẩu hiệu \(tiếng Việt\) không được để trống/)).toBeInTheDocument();
    expect(puts()[0].body).toEqual({ tagline: { vi: null, en: "Clean rice" } });
  });
});
