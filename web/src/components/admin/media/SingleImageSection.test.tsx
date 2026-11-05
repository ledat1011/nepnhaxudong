import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { SingleImageSection } from "./SingleImageSection";

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockResolvedValue([]);
});

describe("SingleImageSection", () => {
  it("shows only the picker when there is no image", () => {
    render(<SingleImageSection mediaId={null} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Ảnh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bỏ ảnh" })).not.toBeInTheDocument();
  });

  it("shows the image number and removes the image with Bỏ ảnh", async () => {
    const onChange = vi.fn();
    render(<SingleImageSection mediaId={9} onChange={onChange} />);
    expect(screen.getByText("(chưa có mô tả)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Bỏ ảnh" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
