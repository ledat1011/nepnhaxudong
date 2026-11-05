import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ZaloLink } from "./ZaloLink";

const qr = vi.hoisted(() => ({
  toString: vi.fn<(text: string, options: unknown) => Promise<string>>(),
}));

vi.mock("qrcode", () => ({ toString: qr.toString }));

const labels = getDictionary("vi").zalo;
const NUMBER = "0000 000 000";
const HREF = "https://zalo.me/0000000000";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25"><path d="M0 0h1v1H0z"/></svg>';

type Screen = { width: number; pointer: "fine" | "coarse" };
const DESKTOP: Screen = { width: 1280, pointer: "fine" };
const NARROW_DESKTOP: Screen = { width: 600, pointer: "fine" };
const PHONE: Screen = { width: 375, pointer: "coarse" };
const TOUCH_TABLET: Screen = { width: 1024, pointer: "coarse" };

/**
 * Answers media queries the way a browser with this screen would. Only the features the
 * component may ask about are known; any other query fails the test.
 */
function evaluate(query: string, screen: Screen): boolean {
  return query.split(",").some((part) => {
    const text = part.trim();
    const maxWidth = /^\(max-width:\s*(\d+)px\)$/.exec(text);
    if (maxWidth) return screen.width <= Number(maxWidth[1]);
    const pointer = /^\(pointer:\s*(coarse|fine)\)$/.exec(text);
    if (pointer) return screen.pointer === pointer[1];
    throw new Error(`Unknown media query in test: ${query}`);
  });
}

function setScreen(screen: Screen) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: evaluate(query, screen),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderLink(zalo = NUMBER) {
  return render(
    <main>
      <ZaloLink zalo={zalo} labels={labels} className="trigger">
        Liên hệ qua Zalo
      </ZaloLink>
    </main>,
  );
}

const trigger = () => screen.getByRole("link", { name: "Liên hệ qua Zalo" });
const overlay = () => document.querySelector("[data-zalo-overlay]") as HTMLElement;
const panel = () => screen.getByRole("dialog", { name: labels.title });
const openLink = () => screen.getByRole("link", { name: new RegExp(labels.open) });
/** A click on the backdrop. Radix closes on the click that follows the pointer down. */
function clickBackdrop() {
  fireEvent.pointerDown(overlay(), { button: 0 });
  fireEvent.mouseDown(overlay(), { button: 0 });
  fireEvent.pointerUp(overlay(), { button: 0 });
  fireEvent.mouseUp(overlay(), { button: 0 });
  fireEvent.click(overlay(), { button: 0 });
}
const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe("ZaloLink", () => {
  beforeEach(() => {
    qr.toString.mockReset();
    qr.toString.mockResolvedValue(SVG);
    setScreen(DESKTOP);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a plain link to zalo.me, so it still works without JavaScript", () => {
    renderLink();
    expect(trigger()).toHaveAttribute("href", HREF);
    expect(trigger()).toHaveClass("trigger");
  });

  it("does not load the QR code library before the dialog opens", () => {
    renderLink();
    expect(qr.toString).not.toHaveBeenCalled();
  });

  describe("on a desktop screen", () => {
    it("opens a dialog instead of following the link", async () => {
      renderLink();
      const notPrevented = fireEvent.click(trigger());
      expect(notPrevented).toBe(false);
      const dialog = await screen.findByRole("dialog", { name: labels.title });
      expect(dialog).toHaveAttribute("data-layout", "dialog");
      expect(dialog).toHaveTextContent(NUMBER);
      expect(dialog).toHaveTextContent(labels.scan);
    });

    it("shows a QR code made from the Zalo link, with a text alternative", async () => {
      renderLink();
      await userEvent.click(trigger());
      const image = await screen.findByRole("img", { name: labels.qrAlt });
      expect(qr.toString).toHaveBeenCalledWith(HREF, expect.objectContaining({ type: "svg" }));
      expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
      expect(image).toHaveAttribute("width");
      expect(image).toHaveAttribute("height");
    });

    it("says the QR code is loading until it is made", async () => {
      let finish: (svg: string) => void = () => {};
      qr.toString.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      renderLink();
      await userEvent.click(trigger());
      expect(await screen.findByText(labels.qrLoading)).toBeInTheDocument();
      await act(async () => finish(SVG));
      expect(screen.queryByText(labels.qrLoading)).not.toBeInTheDocument();
    });

    it("says what to do when the QR code cannot be made", async () => {
      qr.toString.mockRejectedValue(new Error("too long"));
      renderLink();
      await userEvent.click(trigger());
      expect(await screen.findByText(labels.qrError)).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: labels.qrAlt })).not.toBeInTheDocument();
    });

    it("has an Open Zalo link that opens the chat in a new tab", async () => {
      renderLink();
      await userEvent.click(trigger());
      await screen.findByRole("dialog");
      expect(openLink()).toHaveAttribute("href", HREF);
      expect(openLink()).toHaveAttribute("target", "_blank");
      expect(openLink()).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });

    it("closes with Escape and gives focus back to the link", async () => {
      const user = userEvent.setup();
      renderLink();
      trigger().focus();
      await user.keyboard("{Enter}");
      await screen.findByRole("dialog");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(trigger()).toHaveFocus();
    });

    it("closes with the close button and gives focus back to the link", async () => {
      const user = userEvent.setup();
      renderLink();
      await user.click(trigger());
      await user.click(await screen.findByRole("button", { name: labels.close }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(trigger()).toHaveFocus();
    });

    it("keeps focus inside the dialog", async () => {
      const user = userEvent.setup();
      renderLink();
      await user.click(trigger());
      const dialog = await screen.findByRole("dialog");
      for (let i = 0; i < 6; i += 1) {
        await user.tab();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
      }
    });

    it("opens again after it was closed", async () => {
      const user = userEvent.setup();
      renderLink();
      await user.click(trigger());
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await user.click(trigger());
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("double click", () => {
    it("keeps the panel open when the second click lands on the backdrop", async () => {
      renderLink();
      fireEvent.click(trigger(), { detail: 1 });
      await screen.findByRole("dialog");
      // Radix starts to listen for clicks outside one task after the panel opens.
      await wait(10);
      clickBackdrop();
      await wait(10);
      expect(panel()).toBeInTheDocument();
    });

    it("still closes on a click on the backdrop a moment later", async () => {
      renderLink();
      fireEvent.click(trigger(), { detail: 1 });
      await screen.findByRole("dialog");
      await wait(450);
      clickBackdrop();
      await wait(10);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("ignores the second click on the link and does not follow it", async () => {
      renderLink();
      // While the panel is open, Radix hides the rest of the page from the accessibility tree.
      const link = trigger();
      fireEvent.click(link, { detail: 1 });
      await screen.findByRole("dialog");
      const asked = vi.mocked(window.matchMedia).mock.calls.length;
      const notPrevented = fireEvent.click(link, { detail: 2 });
      expect(notPrevented).toBe(false);
      expect(vi.mocked(window.matchMedia).mock.calls.length).toBe(asked);
      expect(panel()).toBeInTheDocument();
    });
  });

  describe("screen kinds", () => {
    it("a phone gets a sheet with Open Zalo in the same tab and no QR code", async () => {
      setScreen(PHONE);
      renderLink();
      await userEvent.click(trigger());
      const sheet = await screen.findByRole("dialog", { name: labels.title });
      expect(sheet).toHaveAttribute("data-layout", "sheet");
      // Scrolling inside the sheet never scrolls the page behind it.
      expect(sheet).toHaveClass("overscroll-contain");
      expect(sheet).toHaveTextContent(labels.phoneHint);
      expect(openLink()).toHaveAttribute("href", HREF);
      // Same tab: the zalo.me link hands the chat to the Zalo app.
      expect(openLink()).not.toHaveAttribute("target");
      expect(screen.getByRole("button", { name: labels.copy })).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(qr.toString).not.toHaveBeenCalled();
    });

    it("a narrow desktop window gets the sheet layout, but with the QR code and a new tab", async () => {
      setScreen(NARROW_DESKTOP);
      renderLink();
      await userEvent.click(trigger());
      const sheet = await screen.findByRole("dialog", { name: labels.title });
      expect(sheet).toHaveAttribute("data-layout", "sheet");
      expect(await screen.findByRole("img", { name: labels.qrAlt })).toBeInTheDocument();
      expect(openLink()).toHaveAttribute("target", "_blank");
    });

    it("a wide touch screen gets the dialog layout without a QR code", async () => {
      setScreen(TOUCH_TABLET);
      renderLink();
      await userEvent.click(trigger());
      const dialog = await screen.findByRole("dialog", { name: labels.title });
      expect(dialog).toHaveAttribute("data-layout", "dialog");
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(openLink()).not.toHaveAttribute("target");
    });
  });

  describe("copy number", () => {
    let execCommand: ReturnType<typeof vi.fn>;
    const original = document.execCommand;

    beforeEach(() => {
      execCommand = vi.fn(() => false);
      document.execCommand = execCommand as unknown as typeof document.execCommand;
    });

    afterEach(() => {
      document.execCommand = original;
    });

    it("copies the digits and confirms it", async () => {
      const user = userEvent.setup();
      renderLink();
      await user.click(trigger());
      await user.click(await screen.findByRole("button", { name: labels.copy }));
      expect(await navigator.clipboard.readText()).toBe("0000000000");
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(labels.copied));
      expect(execCommand).not.toHaveBeenCalled();
    });

    it("copies with the older copy command where the clipboard API is missing (http)", async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
      let copied: { value: string; inPanel: boolean } | null = null;
      execCommand.mockImplementation((command: string) => {
        const field = document.activeElement as HTMLTextAreaElement;
        const selected = field.value.slice(field.selectionStart, field.selectionEnd);
        copied = { value: selected, inPanel: panel().contains(field) };
        return command === "copy";
      });
      renderLink();
      await user.click(trigger());
      const button = await screen.findByRole("button", { name: labels.copy });
      await user.click(button);
      expect(execCommand).toHaveBeenCalledWith("copy");
      // Inside the panel: the focus trap would take focus back from a field in the body.
      expect(copied).toEqual({ value: "0000000000", inPanel: true });
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(labels.copied));
      expect(document.querySelector("textarea")).toBeNull();
      expect(button).toHaveFocus();
    });

    it("says how to copy by hand when the browser refuses both ways", async () => {
      const user = userEvent.setup();
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
      renderLink();
      await user.click(trigger());
      await user.click(await screen.findByRole("button", { name: labels.copy }));
      expect(await screen.findByText(labels.copyFailed)).toBeInTheDocument();
      expect(execCommand).toHaveBeenCalledWith("copy");
    });

    it("clears the message when the panel closes, so a reopened panel starts clean", async () => {
      const user = userEvent.setup();
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
      renderLink();
      await user.click(trigger());
      await user.click(await screen.findByRole("button", { name: labels.copy }));
      await screen.findByText(labels.copyFailed);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await user.click(trigger());
      await screen.findByRole("dialog");
      expect(screen.getByRole("status")).toHaveTextContent("");
    });

    it("empties the status before a repeated result, so screen readers hear it again", async () => {
      const user = userEvent.setup();
      const frames: FrameRequestCallback[] = [];
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      const runFrames = () => act(() => frames.splice(0).forEach((callback) => callback(0)));
      renderLink();
      await user.click(trigger());
      const button = await screen.findByRole("button", { name: labels.copy });
      await user.click(button);
      await runFrames();
      expect(screen.getByRole("status")).toHaveTextContent(labels.copied);
      await user.click(button);
      expect(screen.getByRole("status")).toHaveTextContent("");
      await runFrames();
      expect(screen.getByRole("status")).toHaveTextContent(labels.copied);
    });
  });

  it("has no number and no copy button when the setting is a full URL", async () => {
    renderLink("https://zalo.me/abc");
    expect(trigger()).toHaveAttribute("href", "https://zalo.me/abc");
    await userEvent.click(trigger());
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: labels.copy })).not.toBeInTheDocument();
    expect(screen.queryByText(labels.number)).not.toBeInTheDocument();
  });

  const modified = [
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }],
    ["Shift", { shiftKey: true }],
    ["Alt", { altKey: true }],
    ["middle button", { button: 1 }],
  ] as const;

  for (const [name, init] of modified) {
    it(`leaves a ${name} click to the browser (new tab or window)`, () => {
      renderLink();
      const notPrevented = fireEvent.click(trigger(), init);
      expect(notPrevented).toBe(true);
      expect(window.matchMedia).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  }
});
