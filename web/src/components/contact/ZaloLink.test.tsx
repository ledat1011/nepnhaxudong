import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ZaloLink, SHEET_MEDIA_QUERY } from "./ZaloLink";

const qr = vi.hoisted(() => ({
  toString: vi.fn<(text: string, options: unknown) => Promise<string>>(),
}));

vi.mock("qrcode", () => ({ toString: qr.toString }));

const labels = getDictionary("vi").zalo;
const NUMBER = "0000 000 000";
const HREF = "https://zalo.me/0000000000";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25"><path d="M0 0h1v1H0z"/></svg>';

/** The browser answers the phone media query with `phone`. */
function setScreen(phone: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === SHEET_MEDIA_QUERY ? phone : false,
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

describe("ZaloLink", () => {
  beforeEach(() => {
    qr.toString.mockReset();
    qr.toString.mockResolvedValue(SVG);
    setScreen(false);
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

  describe("on a wide screen", () => {
    it("opens a dialog instead of following the link", async () => {
      renderLink();
      const notPrevented = fireEvent.click(trigger());
      expect(notPrevented).toBe(false);
      const dialog = await screen.findByRole("dialog", { name: labels.title });
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
      const open = await screen.findByRole("link", { name: new RegExp(labels.open) });
      expect(open).toHaveAttribute("href", HREF);
      expect(open).toHaveAttribute("target", "_blank");
      expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));
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

  describe("on a phone", () => {
    beforeEach(() => setScreen(true));

    it("opens a sheet with Open Zalo and Copy number, and no QR code", async () => {
      renderLink();
      await userEvent.click(trigger());
      const sheet = await screen.findByRole("dialog", { name: labels.title });
      expect(sheet).toHaveTextContent(labels.phoneHint);
      expect(screen.getByRole("link", { name: labels.open })).toHaveAttribute("href", HREF);
      // Same tab: the zalo.me link hands the chat to the Zalo app.
      expect(screen.getByRole("link", { name: labels.open })).not.toHaveAttribute("target");
      expect(screen.getByRole("button", { name: labels.copy })).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(qr.toString).not.toHaveBeenCalled();
    });
  });

  describe("copy number", () => {
    it("copies the digits and confirms it", async () => {
      const user = userEvent.setup();
      renderLink();
      await user.click(trigger());
      await user.click(await screen.findByRole("button", { name: labels.copy }));
      expect(await navigator.clipboard.readText()).toBe("0000000000");
      expect(screen.getByRole("status")).toHaveTextContent(labels.copied);
    });

    it("says how to copy by hand when the browser refuses", async () => {
      const user = userEvent.setup();
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
      renderLink();
      await user.click(trigger());
      await user.click(await screen.findByRole("button", { name: labels.copy }));
      expect(await screen.findByText(labels.copyFailed)).toBeInTheDocument();
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

  it("lets a modified click open zalo.me in a new tab as usual", () => {
    renderLink();
    const notPrevented = fireEvent.click(trigger(), { ctrlKey: true });
    expect(notPrevented).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
