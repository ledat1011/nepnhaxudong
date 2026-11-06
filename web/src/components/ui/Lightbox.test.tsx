import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ImgHTMLAttributes, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Lightbox, type LightboxImage } from "./Lightbox";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

const dict = getDictionary("vi");

const IMAGES: LightboxImage[] = [1, 2, 3].map((n) => ({
  src: `https://cdn.example.com/${n}.webp`,
  width: 800,
  height: 600,
  alt: `Ảnh số ${n}`,
}));

/** A page with one opener button per image, as a caller of the lightbox would have. */
function Harness({ images = IMAGES }: { images?: LightboxImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      {images.map((image, i) => (
        <button key={image.src} type="button" onClick={() => setIndex(i)}>
          {`Mở ${image.alt}`}
        </button>
      ))}
      <Lightbox
        images={images}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
        dict={dict}
      />
    </>
  );
}

const dialogImage = () => screen.getByRole("dialog").querySelector("img");

describe("Lightbox", () => {
  it("renders nothing while no image is chosen", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a labelled modal dialog at the chosen image and focuses the close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 2" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(dict.gallery.viewLarge);
    expect(dialogImage()).toHaveAttribute("alt", "Ảnh số 2");
    // The whole photo is shown, never cropped.
    expect(dialogImage()).toHaveClass("object-contain");
    expect(screen.getByRole("button", { name: dict.gallery.close })).toHaveFocus();
  });

  it("steps through the images with the buttons and wraps around", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 3" }));
    await user.click(screen.getByRole("button", { name: dict.gallery.next }));
    expect(dialogImage()).toHaveAttribute("alt", "Ảnh số 1");
    await user.click(screen.getByRole("button", { name: dict.gallery.previous }));
    expect(dialogImage()).toHaveAttribute("alt", "Ảnh số 3");
  });

  it("steps through the images with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(dialogImage()).toHaveAttribute("alt", "Ảnh số 3");
    await user.keyboard("{ArrowLeft}");
    expect(dialogImage()).toHaveAttribute("alt", "Ảnh số 2");
  });

  it("keeps focus on the close button while the image changes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: dict.gallery.close })).toHaveFocus();
  });

  it("has no arrows with one image", async () => {
    const user = userEvent.setup();
    render(<Harness images={IMAGES.slice(0, 1)} />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    expect(screen.queryByRole("button", { name: dict.gallery.next })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.gallery.previous })).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the button that opened it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Mở Ảnh số 2" });
    await user.click(opener);
    await user.keyboard("{ArrowRight}{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes with the close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    await user.click(screen.getByRole("button", { name: dict.gallery.close }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on a click on the backdrop but not on a click on the image", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    await user.click(dialogImage()!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("locks page scroll while open", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("is placed at the end of the body, outside any parent that moves with a transform", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Mở Ảnh số 1" }));
    expect(container).not.toContainElement(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog").parentElement).toBe(document.body);
  });
});
