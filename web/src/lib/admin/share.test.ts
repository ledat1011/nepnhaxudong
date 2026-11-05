import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shareOrCopy } from "./share";

const data = { title: "Nếp Nhà", text: "Bài mới", url: "https://nepnha.vn/vi/cau-chuyen/a" };

function setShare(share: ((value: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "share", { value: share, configurable: true, writable: true });
}

beforeEach(() => {
  // user-event puts a working clipboard on navigator (jsdom has none).
  userEvent.setup();
});

afterEach(() => {
  setShare(undefined);
  vi.restoreAllMocks();
});

describe("shareOrCopy", () => {
  it("opens the share sheet of the phone when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    expect(await shareOrCopy(data)).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
  });

  it("does nothing more when the user closes the share sheet", async () => {
    setShare(vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")));
    const write = vi.spyOn(navigator.clipboard, "writeText");
    expect(await shareOrCopy(data)).toBe("cancelled");
    expect(write).not.toHaveBeenCalled();
  });

  it("copies the text and the link when there is no share sheet", async () => {
    setShare(undefined);
    expect(await shareOrCopy(data)).toBe("copied");
    expect(await navigator.clipboard.readText()).toBe("Bài mới\nhttps://nepnha.vn/vi/cau-chuyen/a");
  });

  it("copies when the share sheet refuses for another reason", async () => {
    setShare(vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")));
    expect(await shareOrCopy({ text: "Mật khẩu tạm: lua-vang" })).toBe("copied");
    expect(await navigator.clipboard.readText()).toBe("Mật khẩu tạm: lua-vang");
  });

  it("says it failed when the copy fails too", async () => {
    setShare(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    expect(await shareOrCopy(data)).toBe("failed");
  });
});
