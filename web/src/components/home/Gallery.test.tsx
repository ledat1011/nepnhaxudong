import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Gallery, type GalleryImage } from "./Gallery";

vi.mock("next/image", () => ({
  default: ({
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img data-priority={priority ? "true" : undefined} {...props} />
  ),
}));

const dict = getDictionary("vi");

const IMAGES: GalleryImage[] = [1, 2, 3].map((n) => ({
  src: `https://cdn.example.com/${n}.webp`,
  width: 800,
  height: 600,
  alt: `Ảnh số ${n}`,
}));

function mainImage(): HTMLElement {
  return screen.getByRole("button", { name: dict.gallery.viewLarge });
}

describe("Gallery", () => {
  it("shows the first image large and a thumbnail per image", () => {
    render(<Gallery images={IMAGES} dict={dict} />);
    expect(mainImage().querySelector("img")).toHaveAttribute("alt", "Ảnh số 1");
    expect(screen.getAllByRole("button", { name: /Ảnh số \d/ })).toHaveLength(3);
  });

  it("changes the large image when a thumbnail is clicked", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(screen.getByRole("button", { name: "Ảnh số 2" }));
    expect(mainImage().querySelector("img")).toHaveAttribute("alt", "Ảnh số 2");
    expect(screen.getByRole("button", { name: "Ảnh số 2" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens a labelled modal dialog when the large image is clicked", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(mainImage());
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName();
    expect(screen.getByRole("button", { name: dict.gallery.close })).toHaveFocus();
  });

  it("changes the image with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(mainImage());
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("img")).toHaveAttribute("alt", "Ảnh số 1");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(dialog.querySelector("img")).toHaveAttribute("alt", "Ảnh số 3");
    await user.keyboard("{ArrowLeft}");
    expect(dialog.querySelector("img")).toHaveAttribute("alt", "Ảnh số 2");
  });

  it("changes the image with the previous and next buttons", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(mainImage());
    await user.click(screen.getByRole("button", { name: dict.gallery.next }));
    expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute("alt", "Ảnh số 2");
    await user.click(screen.getByRole("button", { name: dict.gallery.previous }));
    expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute("alt", "Ảnh số 1");
  });

  it("closes on Escape and returns focus to the large image", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(mainImage());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mainImage()).toHaveFocus();
  });

  it("closes with the close button", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(mainImage());
    await user.click(screen.getByRole("button", { name: dict.gallery.close }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(mainImage());
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("locks page scroll while the dialog is open", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES} dict={dict} />);
    await user.click(mainImage());
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("has no thumbnails and no arrows when there is one image", async () => {
    const user = userEvent.setup();
    render(<Gallery images={IMAGES.slice(0, 1)} dict={dict} />);
    expect(screen.queryByRole("button", { name: "Ảnh số 1" })).not.toBeInTheDocument();
    await user.click(mainImage());
    expect(screen.queryByRole("button", { name: dict.gallery.next })).not.toBeInTheDocument();
  });

  it("shows a placeholder and no lightbox when there are no images", async () => {
    const user = userEvent.setup();
    render(<Gallery images={[]} dict={dict} />);
    const placeholder = screen.getByRole("img", { name: dict.image.placeholder });
    await user.click(placeholder);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
