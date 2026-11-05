import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));

import { SettingLoader } from "./SettingLoader";

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
});

describe("SettingLoader", () => {
  it("shows a loading text, then gives the loaded value to its child", async () => {
    adminFetch.mockResolvedValue({ tagline: null });
    render(<SettingLoader<{ tagline: null }> name="brand">{(value) => <p>loaded {JSON.stringify(value)}</p>}</SettingLoader>);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải");
    expect(await screen.findByText('loaded {"tagline":null}')).toBeInTheDocument();
    expect(adminFetch).toHaveBeenCalledWith("/admin/settings/brand");
  });

  it("shows the API text and loads again on Thử lại", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    adminFetch.mockResolvedValue({ facebook: null });
    render(<SettingLoader<object> name="social">{() => <p>ready</p>}</SettingLoader>);
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("ready")).toBeInTheDocument();
  });

  it("ignores an answer that arrives after the component left", async () => {
    let finish: (value: unknown) => void = () => {};
    adminFetch.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const render1 = vi.fn(() => <p>ready</p>);
    const { unmount } = render(<SettingLoader<object> name="social">{render1}</SettingLoader>);
    unmount();
    finish({});
    await Promise.resolve();
    expect(render1).not.toHaveBeenCalled();
  });
});
