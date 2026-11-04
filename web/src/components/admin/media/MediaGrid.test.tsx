import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MediaAdminDto } from "@/lib/admin/types";
import { MediaGrid } from "./MediaGrid";

const items: MediaAdminDto[] = [
  { id: 2, url: "/media/2.webp", width: 400, height: 300, mime: "image/webp", altVi: "Hai", altEn: "Two" },
  { id: 1, url: "/media/1.webp", width: 300, height: 400, mime: "image/webp", altVi: null, altEn: null },
];

describe("MediaGrid", () => {
  it("renders lazy images with their size and Vietnamese alt text", () => {
    render(<MediaGrid items={items} onSelect={() => {}} />);
    const img = screen.getByAltText("Hai");
    expect(img).toHaveAttribute("src", "/media/2.webp");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "400");
    expect(img).toHaveAttribute("height", "300");
  });

  it("calls onSelect with the image", async () => {
    const onSelect = vi.fn();
    render(<MediaGrid items={items} onSelect={onSelect} />);
    await userEvent.setup().click(screen.getByAltText("Hai"));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("marks the selected images with aria-pressed", () => {
    render(<MediaGrid items={items} onSelect={() => {}} selectedIds={[2]} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an empty text when there are no images", () => {
    render(<MediaGrid items={[]} onSelect={() => {}} />);
    expect(screen.getByText("Chưa có ảnh nào.")).toBeInTheDocument();
  });
});
