import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TimelineEvent } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { JourneySection } from "./JourneySection";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const dict = getDictionary("vi");

const EVENTS: TimelineEvent[] = [
  { year: 1998, title: "[MẪU] Mốc một", description: "[MẪU] Mô tả một", image: null },
  {
    year: 2015,
    title: "[MẪU] Mốc hai",
    description: "[MẪU] Mô tả hai",
    image: { url: "https://cdn.example.com/b.webp", width: 800, height: 600, alt: "Ảnh mốc hai" },
  },
  { year: 2026, title: "[MẪU] Mốc ba", description: "[MẪU] Mô tả ba", image: null },
];

describe("JourneySection", () => {
  it("has the section heading", () => {
    render(<JourneySection dict={dict} events={EVENTS} />);
    expect(screen.getByRole("heading", { level: 2, name: dict.sections.journey })).toHaveAttribute(
      "id",
      "hanh-trinh",
    );
  });

  it("lists the events in the order of the array with year, title and description", () => {
    render(<JourneySection dict={dict} events={EVENTS} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("1998");
    expect(items[0]).toHaveTextContent("[MẪU] Mốc một");
    expect(items[0]).toHaveTextContent("[MẪU] Mô tả một");
    expect(items[1]).toHaveTextContent("2015");
    expect(items[2]).toHaveTextContent("2026");
  });

  it("shows a placeholder for an event without an image", () => {
    render(<JourneySection dict={dict} events={EVENTS} />);
    expect(screen.getAllByRole("img", { name: dict.image.placeholder })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Ảnh mốc hai" })).toBeInTheDocument();
  });

  it("gives the line and each event a hook for the later animation", () => {
    const { container } = render(<JourneySection dict={dict} events={EVENTS} />);
    const line = container.querySelector("[data-journey-line]");
    expect(line).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("[data-journey-event]")).toHaveLength(3);
  });
});
