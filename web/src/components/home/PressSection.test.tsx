import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PressMention } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { PressSection } from "./PressSection";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const dict = getDictionary("vi");

const ITEMS: PressMention[] = [
  {
    title: "[MẪU] Bài một",
    sourceName: "[MẪU] Báo Một",
    url: "https://example.com/bai-1",
    publishedOn: "2026-03-20",
    image: null,
  },
  {
    title: "[MẪU] Bài hai",
    sourceName: "[MẪU] Báo Hai",
    url: "https://example.com/bai-2",
    publishedOn: null,
    image: null,
  },
];

describe("PressSection", () => {
  it("has the section heading", () => {
    render(<PressSection lang="vi" dict={dict} items={ITEMS} />);
    expect(screen.getByRole("heading", { level: 2, name: dict.sections.press })).toHaveAttribute(
      "id",
      "bao-chi",
    );
  });

  it("shows source, title and formatted date", () => {
    render(<PressSection lang="vi" dict={dict} items={ITEMS} />);
    expect(screen.getByText("[MẪU] Báo Một")).toBeInTheDocument();
    expect(screen.getByText("[MẪU] Bài một")).toBeInTheDocument();
    expect(screen.getByText("20 tháng 3, 2026")).toBeInTheDocument();
  });

  it("prints no date when the date is null", () => {
    render(<PressSection lang="vi" dict={dict} items={ITEMS.slice(1)} />);
    expect(screen.queryByRole("time")).not.toBeInTheDocument();
    expect(document.querySelector("time")).toBeNull();
  });

  it("opens each article in a new tab without leaking the opener", () => {
    render(<PressSection lang="vi" dict={dict} items={ITEMS} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    // Screen reader users hear that the link opens a new tab.
    expect(links[0]).toHaveAccessibleName(/\(mở trong tab mới\)$/);
    expect(links[0]).toHaveAttribute("href", "https://example.com/bai-1");
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("draws no image box when an item has no image", () => {
    const { container } = render(<PressSection lang="vi" dict={dict} items={ITEMS} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("[data-press-photo]")).toBeNull();
  });

  it("shows the image of an item that has one", () => {
    const image = { url: "https://cdn.example.com/p.webp", width: 800, height: 450, alt: "Ảnh bài" };
    const { container } = render(
      <PressSection lang="vi" dict={dict} items={[{ ...ITEMS[0], image }, ITEMS[1]]} />,
    );
    expect(screen.getByRole("img", { name: "Ảnh bài" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-press-photo]")).toHaveLength(1);
  });
});
