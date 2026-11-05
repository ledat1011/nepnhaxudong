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
    const list = screen.getByRole("list");
    // Tailwind's reset removes the list styling, and Safari then drops the list role.
    expect(list).toHaveAttribute("role", "list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("1998");
    expect(items[0]).toHaveTextContent("[MẪU] Mốc một");
    expect(items[0]).toHaveTextContent("[MẪU] Mô tả một");
    expect(items[1]).toHaveTextContent("2015");
    expect(items[2]).toHaveTextContent("2026");
  });

  it("draws no image box for an event without an image", () => {
    const { container } = render(<JourneySection dict={dict} events={EVENTS} />);
    expect(screen.queryByRole("img", { name: dict.image.placeholder })).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-journey-photo]")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Ảnh mốc hai" })).toBeInTheDocument();
  });

  it("gives the line and each event a hook for the later animation", () => {
    const { container } = render(<JourneySection dict={dict} events={EVENTS} />);
    const line = container.querySelector("[data-journey-line]");
    expect(line).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("[data-journey-event]")).toHaveLength(3);
  });
  it("renders one leaf per event and one ear", () => {
    const { container } = render(<JourneySection dict={dict} events={EVENTS} />);
    const leaves = Array.from(container.querySelectorAll("[data-journey-leaf]"));
    expect(leaves).toHaveLength(3);
    const owners = leaves.map((leaf) => leaf.closest("[data-journey-event]"));
    expect(owners.every((owner) => owner !== null)).toBe(true);
    expect(new Set(owners).size).toBe(3);
    expect(container.querySelectorAll("[data-journey-ear]")).toHaveLength(1);
  });

  it("shows the whole plant without JavaScript", () => {
    const { container } = render(<JourneySection dict={dict} events={EVENTS} />);
    const styled = Array.from(container.querySelectorAll("[style]")).filter((el) => {
      const style = el.getAttribute("style") ?? "";
      return style.includes("opacity") || style.includes("scale");
    });
    expect(styled).toHaveLength(0);
  });
});
