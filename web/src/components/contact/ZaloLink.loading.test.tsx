import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// How the panel chunk loads is set per test, so each test imports a fresh ZaloLink.
const navigation = vi.hoisted(() => ({ leaveTo: vi.fn<(href: string) => void>() }));
vi.mock("@/lib/navigation", () => navigation);
vi.mock("qrcode", () => ({ toString: async () => "<svg/>" }));

const labels = getDictionary("vi").zalo;

async function renderLink() {
  const { ZaloLink } = await import("./ZaloLink");
  render(
    <ZaloLink zalo="0000 000 000" labels={labels}>
      Zalo
    </ZaloLink>,
  );
  return screen.getByRole("link", { name: "Zalo" });
}

describe("ZaloLink while the panel code loads", () => {
  beforeEach(() => {
    vi.resetModules();
    navigation.leaveTo.mockReset();
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.doUnmock("./ZaloPanel");
  });

  it("marks the link busy with a wait cursor until the panel opens", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.doMock("./ZaloPanel", async (importOriginal) => {
      await gate;
      return importOriginal();
    });
    const link = await renderLink();
    expect(link).not.toHaveAttribute("aria-busy");

    fireEvent.click(link);
    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveClass("cursor-wait");

    await act(async () => release());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(link).not.toHaveAttribute("aria-busy");
    expect(link).not.toHaveClass("cursor-wait");
  });

  it("goes to zalo.me, as the plain link would, when the panel code cannot load", async () => {
    vi.doMock("./ZaloPanel", () => {
      throw new Error("chunk failed to load");
    });
    const link = await renderLink();
    fireEvent.click(link);
    await vi.waitFor(() =>
      expect(navigation.leaveTo).toHaveBeenCalledWith("https://zalo.me/0000000000"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(link).not.toHaveAttribute("aria-busy");
  });
});
