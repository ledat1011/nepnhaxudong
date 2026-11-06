import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LightboxImage } from "@/components/ui/Lightbox";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { JourneyPhotos } from "./JourneyPhotos";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

const dict = getDictionary("vi");

const PHOTOS: LightboxImage[] = [1, 2, 3].map((n) => ({
  src: `/journey/${n}.webp`,
  width: 1200,
  height: 900,
  alt: `Ảnh mốc ${n}`,
}));

function frames(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-journey-photo]"));
}

describe("JourneyPhotos", () => {
  it("renders nothing without photos", () => {
    const { container } = render(<JourneyPhotos images={[]} dict={dict} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows one photo in the full-width 4:3 frame", () => {
    const { container } = render(<JourneyPhotos images={PHOTOS.slice(0, 1)} dict={dict} />);
    const [frame, ...rest] = frames(container);
    expect(rest).toHaveLength(0);
    expect(frame).toHaveClass("aspect-[4/3]", "w-full", "rounded-2xl", "border-2", "border-grain");
    expect(frame.parentElement).toHaveClass("max-w-sm");
  });

  it("staggers two photos: a square at the top left, a 4:3 frame from its right edge", () => {
    const { container } = render(<JourneyPhotos images={PHOTOS.slice(0, 2)} dict={dict} />);
    const [first, second] = frames(container);
    expect(frames(container)).toHaveLength(2);
    expect(first).toHaveClass("aspect-square", "w-[40%]");
    expect(first).not.toHaveClass("ml-[40%]");
    // The second frame starts where the first one ends, so their corners meet.
    expect(second).toHaveClass("aspect-[4/3]", "ml-[40%]", "w-[60%]");
  });

  it("puts a third photo in a square below the second, back on the left", () => {
    const { container } = render(<JourneyPhotos images={PHOTOS} dict={dict} />);
    const all = frames(container);
    expect(all).toHaveLength(3);
    expect(all[2]).toHaveClass("aspect-square", "w-[40%]");
    expect(all[2]).not.toHaveClass("ml-[40%]");
    for (const frame of all) {
      expect(frame).toHaveClass("rounded-2xl", "border-2", "border-grain");
    }
  });

  it("makes each photo a button named by its alt text", () => {
    render(<JourneyPhotos images={PHOTOS} dict={dict} />);
    for (const photo of PHOTOS) {
      const button = screen.getByRole("button", { name: photo.alt });
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveAttribute("aria-haspopup", "dialog");
      expect(button.querySelector("img")).toHaveClass("object-cover");
    }
  });

  it("names a photo without alt text with the dictionary label", () => {
    render(<JourneyPhotos images={[{ ...PHOTOS[0], alt: "" }]} dict={dict} />);
    expect(screen.getByRole("button", { name: dict.gallery.viewLarge })).toBeInTheDocument();
  });

  it("opens the lightbox at the clicked photo and steps through the milestone's photos", async () => {
    const user = userEvent.setup();
    render(<JourneyPhotos images={PHOTOS} dict={dict} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ảnh mốc 2" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("img")).toHaveAttribute("alt", "Ảnh mốc 2");
    expect(dialog.querySelector("img")).toHaveClass("object-contain");
    await user.click(screen.getByRole("button", { name: dict.gallery.next }));
    expect(dialog.querySelector("img")).toHaveAttribute("alt", "Ảnh mốc 3");
  });

  it("opens with Enter and gives focus back to the same photo on Escape", async () => {
    const user = userEvent.setup();
    render(<JourneyPhotos images={PHOTOS} dict={dict} />);
    const button = screen.getByRole("button", { name: "Ảnh mốc 3" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute("alt", "Ảnh mốc 3");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
