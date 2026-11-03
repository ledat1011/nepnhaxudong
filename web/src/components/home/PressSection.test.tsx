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
    expect(links[0]).toHaveAttribute("href", "https://example.com/bai-1");
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("shows a placeholder when an item has no image", () => {
    render(<PressSection lang="vi" dict={dict} items={ITEMS} />);
    expect(screen.getAllByRole("img", { name: dict.image.placeholder })).toHaveLength(2);
  });
});
